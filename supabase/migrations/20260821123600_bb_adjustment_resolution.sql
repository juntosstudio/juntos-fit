/*
======================================================
20260821123600_bb_adjustment_resolution.sql

Purpose:
    Implements the final deterministic Plan Adjustment
    resolution boundary: explicit accept / decline,
    stale-proposal protection, and transactional
    persistence of an accepted material prescription.
======================================================
*/

begin;

create or replace function
public.resolve_coaching_adjustment_proposal(
    p_proposal_id uuid,
    p_resolution text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_proposal public.coaching_adjustment_proposals%rowtype;
    v_resulting_proposal public.coaching_adjustment_proposals%rowtype;
    v_latest_proposal_id uuid;
    v_plan public.coaching_plans%rowtype;
    v_week public.weekly_checkins%rowtype;
    v_base_target public.coaching_plan_targets%rowtype;
    v_current_target public.coaching_plan_targets%rowtype;
    v_applied_target public.coaching_plan_targets%rowtype;
    v_local_today date;
    v_actual_effective_date date;
    v_later_completed_week_exists boolean := false;
    v_same_day_target_exists boolean := false;
    v_base_matches_current boolean := false;
begin
    if p_resolution not in ('accept', 'decline') then
        raise exception
            'Plan Adjustment resolution must be accept or decline.';
    end if;

    select *
    into v_proposal
    from public.coaching_adjustment_proposals
    where id = p_proposal_id
    for update;

    if not found then
        raise exception 'Plan Adjustment proposal was not found.';
    end if;

    select *
    into v_plan
    from public.coaching_plans
    where id = v_proposal.coaching_plan_id
    for update;

    if not found then
        raise exception 'Coaching plan was not found.';
    end if;

    select *
    into v_week
    from public.weekly_checkins
    where id = v_proposal.weekly_checkin_id;

    if not found then
        raise exception 'Weekly Check-In was not found.';
    end if;

    -- Same-resolution retries are free and deterministic. Opposite
    -- resolutions are conflicts and may never rewrite history.
    if v_proposal.status = 'accepted' then
        if p_resolution = 'accept' then
            if v_proposal.applied_target_id is not null then
                select *
                into v_applied_target
                from public.coaching_plan_targets
                where id = v_proposal.applied_target_id;
            end if;

            return jsonb_build_object(
                'outcome', 'accepted',
                'cached', true,
                'proposal', to_jsonb(v_proposal),
                'applied_target',
                    case
                        when v_applied_target.id is null then null
                        else to_jsonb(v_applied_target)
                    end
            );
        end if;

        raise exception
            'This Plan Adjustment was already accepted and cannot be declined.';
    end if;

    if v_proposal.status = 'declined' then
        if p_resolution = 'decline' then
            return jsonb_build_object(
                'outcome', 'declined',
                'cached', true,
                'proposal', to_jsonb(v_proposal),
                'applied_target', null
            );
        end if;

        raise exception
            'This Plan Adjustment was already declined and cannot be accepted.';
    end if;

    if v_proposal.status = 'expired' then
        return jsonb_build_object(
            'outcome', 'expired',
            'cached', true,
            'proposal', to_jsonb(v_proposal),
            'applied_target', null
        );
    end if;

    if v_proposal.status <> 'proposed' then
        raise exception
            'This Plan Adjustment revision is no longer open for resolution.';
    end if;

    -- The accepted/declined proposal must be the latest revision.
    select proposal.id
    into v_latest_proposal_id
    from public.coaching_adjustment_proposals as proposal
    where proposal.weekly_checkin_id = v_proposal.weekly_checkin_id
    order by proposal.revision_number desc
    limit 1;

    if v_latest_proposal_id is distinct from v_proposal.id then
        raise exception
            'A newer Plan Adjustment revision exists. Resolve the latest proposal instead.';
    end if;

    if p_resolution = 'decline' then
        update public.coaching_adjustment_proposals
        set
            status = 'declined',
            declined_at = now(),
            resolution_reason_code = 'USER_DECLINED',
            resolution_note = null
        where id = v_proposal.id
        returning * into v_resulting_proposal;

        return jsonb_build_object(
            'outcome', 'declined',
            'cached', false,
            'proposal', to_jsonb(v_resulting_proposal),
            'applied_target', null
        );
    end if;

    if v_proposal.proposed_effective_date is null then
        raise exception
            'Plan Adjustment is missing its proposed effective date.';
    end if;

    -- Use the plan's own timezone so a late-evening acceptance does not
    -- accidentally become "tomorrow" just because Postgres runs in UTC.
    v_local_today := (
        timezone(
            coalesce(nullif(v_plan.time_zone, ''), 'UTC'),
            now()
        )
    )::date;

    select exists (
        select 1
        from public.weekly_checkins as later_week
        where later_week.coaching_plan_id = v_proposal.coaching_plan_id
          and later_week.week_number > v_week.week_number
          and later_week.status = 'completed'
    )
    into v_later_completed_week_exists;

    -- A proposal is valid only for the plan week it was intended to
    -- govern. Once that week has ended (or a later Weekly is finalized),
    -- the evidence is stale and the old proposal cannot be applied.
    if v_local_today > (v_proposal.proposed_effective_date + 6)
       or v_later_completed_week_exists then
        update public.coaching_adjustment_proposals
        set
            status = 'expired',
            resolution_reason_code = 'PROPOSAL_EXPIRED',
            resolution_note =
                'Proposal was not accepted during its intended plan week.'
        where id = v_proposal.id
        returning * into v_resulting_proposal;

        return jsonb_build_object(
            'outcome', 'expired',
            'cached', false,
            'proposal', to_jsonb(v_resulting_proposal),
            'applied_target', null
        );
    end if;

    -- Never backdate a prescription to days before the user accepted it.
    -- Late acceptance creates a truthful split week instead.
    v_actual_effective_date := greatest(
        v_proposal.proposed_effective_date,
        v_local_today
    );

    if v_proposal.based_on_target_id is null then
        update public.coaching_adjustment_proposals
        set
            status = 'expired',
            resolution_reason_code = 'STALE_BASE_PRESCRIPTION',
            resolution_note =
                'The proposal did not preserve a canonical base prescription.'
        where id = v_proposal.id
        returning * into v_resulting_proposal;

        return jsonb_build_object(
            'outcome', 'stale',
            'cached', false,
            'proposal', to_jsonb(v_resulting_proposal),
            'applied_target', null
        );
    end if;

    select *
    into v_base_target
    from public.coaching_plan_targets
    where id = v_proposal.based_on_target_id
      and coaching_plan_id = v_proposal.coaching_plan_id;

    if not found then
        update public.coaching_adjustment_proposals
        set
            status = 'expired',
            resolution_reason_code = 'STALE_BASE_PRESCRIPTION',
            resolution_note =
                'The proposal base prescription no longer exists.'
        where id = v_proposal.id
        returning * into v_resulting_proposal;

        return jsonb_build_object(
            'outcome', 'stale',
            'cached', false,
            'proposal', to_jsonb(v_resulting_proposal),
            'applied_target', null
        );
    end if;

    select *
    into v_current_target
    from public.coaching_plan_targets
    where coaching_plan_id = v_proposal.coaching_plan_id
      and effective_date <= v_actual_effective_date
    order by effective_date desc, created_at desc
    limit 1
    for update;

    v_base_matches_current :=
        v_current_target.id is not null
        and v_current_target.calorie_target
            is not distinct from v_base_target.calorie_target
        and v_current_target.protein_grams
            is not distinct from v_base_target.protein_grams
        and v_current_target.carb_grams
            is not distinct from v_base_target.carb_grams
        and v_current_target.fat_grams
            is not distinct from v_base_target.fat_grams
        and v_current_target.weekly_cardio_target_minutes
            is not distinct from v_base_target.weekly_cardio_target_minutes
        and v_current_target.weekly_workout_target
            is not distinct from v_base_target.weekly_workout_target
        and v_current_target.daily_water_goal_oz
            is not distinct from v_base_target.daily_water_goal_oz
        and v_current_target.cardio_intensity_target
            is not distinct from v_base_target.cardio_intensity_target
        and v_current_target.nutrition_ownership
            is not distinct from v_base_target.nutrition_ownership;

    if not v_base_matches_current then
        update public.coaching_adjustment_proposals
        set
            status = 'expired',
            resolution_reason_code = 'STALE_BASE_PRESCRIPTION',
            resolution_note =
                'The plan prescription materially changed after this proposal was formed.'
        where id = v_proposal.id
        returning * into v_resulting_proposal;

        return jsonb_build_object(
            'outcome', 'stale',
            'cached', false,
            'proposal', to_jsonb(v_resulting_proposal),
            'applied_target', null
        );
    end if;

    -- An already-scheduled target on the exact application date wins.
    -- Do not overwrite it or pretend BB created it.
    select exists (
        select 1
        from public.coaching_plan_targets as target
        where target.coaching_plan_id = v_proposal.coaching_plan_id
          and target.effective_date = v_actual_effective_date
          and target.id <> v_proposal.based_on_target_id
    )
    into v_same_day_target_exists;

    if v_same_day_target_exists then
        update public.coaching_adjustment_proposals
        set
            status = 'expired',
            resolution_reason_code = 'STALE_BASE_PRESCRIPTION',
            resolution_note =
                'Another prescription is already scheduled for the acceptance date.'
        where id = v_proposal.id
        returning * into v_resulting_proposal;

        return jsonb_build_object(
            'outcome', 'stale',
            'cached', false,
            'proposal', to_jsonb(v_resulting_proposal),
            'applied_target', null
        );
    end if;

    if v_proposal.decision_type = 'hold' then
        update public.coaching_adjustment_proposals
        set
            status = 'accepted',
            accepted_at = now(),
            effective_date = v_actual_effective_date,
            resolution_reason_code = 'USER_ACCEPTED_HOLD',
            resolution_note = null
        where id = v_proposal.id
        returning * into v_resulting_proposal;

        return jsonb_build_object(
            'outcome', 'accepted',
            'cached', false,
            'proposal', to_jsonb(v_resulting_proposal),
            'applied_target', null
        );
    end if;

    if v_proposal.decision_type <> 'recommend_change' then
        raise exception
            'Plan Adjustment decision type cannot be persisted.';
    end if;

    insert into public.coaching_plan_targets (
        coaching_plan_id,
        effective_date,
        calorie_target,
        protein_grams,
        carb_grams,
        fat_grams,
        weekly_cardio_target_minutes,
        weekly_workout_target,
        daily_water_goal_oz,
        nutrition_ownership,
        prescription_source,
        cardio_intensity_target
    )
    values (
        v_proposal.coaching_plan_id,
        v_actual_effective_date,
        v_proposal.proposed_calorie_target,
        v_proposal.proposed_protein_grams,
        v_proposal.proposed_carb_grams,
        v_proposal.proposed_fat_grams,
        v_proposal.proposed_weekly_cardio_target_minutes,
        v_proposal.proposed_weekly_workout_target,
        v_proposal.proposed_daily_water_goal_oz,
        v_proposal.proposed_nutrition_ownership,
        'bb_adjustment',
        v_proposal.proposed_cardio_intensity_target
    )
    returning * into v_applied_target;

    update public.coaching_adjustment_proposals
    set
        status = 'accepted',
        accepted_at = now(),
        effective_date = v_actual_effective_date,
        applied_target_id = v_applied_target.id,
        resolution_reason_code = 'USER_ACCEPTED_CHANGE',
        resolution_note = null
    where id = v_proposal.id
    returning * into v_resulting_proposal;

    return jsonb_build_object(
        'outcome', 'accepted',
        'cached', false,
        'proposal', to_jsonb(v_resulting_proposal),
        'applied_target', to_jsonb(v_applied_target)
    );
end;
$$;

revoke all
on function public.resolve_coaching_adjustment_proposal(uuid, text)
from public, anon, authenticated;

grant execute
on function public.resolve_coaching_adjustment_proposal(uuid, text)
to service_role;

comment on function
    public.resolve_coaching_adjustment_proposal(uuid, text)
is 'Final deterministic Plan Adjustment gate. Atomically accepts or declines only the latest open frozen proposal, expires stale proposals, and inserts the exact accepted material prescription into coaching_plan_targets with bb_adjustment provenance. Same-resolution retries are idempotent.';

commit;
