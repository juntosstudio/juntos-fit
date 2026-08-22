/*
======================================================
20260821123500_bb_adjustment_conversation_turns.sql

Purpose:
    Hardens resumable Plan Adjustment conversation turns
    with client-message idempotency and a transactional
    server-side revision finalizer.
======================================================
*/

begin;

/******************************************************************************
    1. Idempotent conversation-turn links
******************************************************************************/

alter table public.coaching_adjustment_messages
    add column if not exists client_message_id uuid,
    add column if not exists in_reply_to_message_id uuid
        references public.coaching_adjustment_messages(id)
        on delete set null;

create unique index if not exists
    coaching_adjustment_messages_user_client_unique_idx
on public.coaching_adjustment_messages (
    weekly_checkin_id,
    client_message_id
)
where role = 'user'
  and client_message_id is not null;

create unique index if not exists
    coaching_adjustment_messages_coach_reply_unique_idx
on public.coaching_adjustment_messages (
    in_reply_to_message_id
)
where role = 'coach'
  and in_reply_to_message_id is not null;

create index if not exists
    coaching_adjustment_messages_reply_idx
on public.coaching_adjustment_messages (
    in_reply_to_message_id,
    created_at
)
where in_reply_to_message_id is not null;

create or replace function
public.validate_coaching_adjustment_message_links()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if not exists (
        select 1
        from public.weekly_checkins as weekly
        where weekly.id = new.weekly_checkin_id
          and weekly.coaching_plan_id = new.coaching_plan_id
    ) then
        raise exception
            'Adjustment message Weekly Check-In must belong to the same coaching plan.';
    end if;

    if new.proposal_id is not null
       and not exists (
           select 1
           from public.coaching_adjustment_proposals as proposal
           where proposal.id = new.proposal_id
             and proposal.weekly_checkin_id = new.weekly_checkin_id
             and proposal.coaching_plan_id = new.coaching_plan_id
       ) then
        raise exception
            'Adjustment message proposal must belong to the same Weekly Check-In and coaching plan.';
    end if;

    if new.in_reply_to_message_id is not null
       and not exists (
           select 1
           from public.coaching_adjustment_messages as prior
           where prior.id = new.in_reply_to_message_id
             and prior.weekly_checkin_id = new.weekly_checkin_id
             and prior.coaching_plan_id = new.coaching_plan_id
             and prior.role = 'user'
       ) then
        raise exception
            'Adjustment coach reply must reference a user message from the same Weekly Check-In and coaching plan.';
    end if;

    if new.role = 'user'
       and new.in_reply_to_message_id is not null then
        raise exception
            'User adjustment messages cannot be replies to another adjustment message.';
    end if;

    return new;
end;
$$;

/******************************************************************************
    2. Transactional turn finalizer

    The Edge Function performs the AI call outside a DB transaction. This RPC
    owns only the deterministic persistence boundary after model output has
    already been validated against the legal-action set.
******************************************************************************/

create or replace function
public.finalize_coaching_adjustment_turn(
    p_current_proposal_id uuid,
    p_user_message_id uuid,
    p_coach_reply text,
    p_revision jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    current_proposal public.coaching_adjustment_proposals%rowtype;
    resulting_proposal public.coaching_adjustment_proposals%rowtype;
    user_message public.coaching_adjustment_messages%rowtype;
    coach_message public.coaching_adjustment_messages%rowtype;
    existing_reply public.coaching_adjustment_messages%rowtype;
    existing_proposal public.coaching_adjustment_proposals%rowtype;
    should_revise boolean := p_revision is not null;
begin
    if length(btrim(coalesce(p_coach_reply, ''))) = 0 then
        raise exception 'Coach reply content is required.';
    end if;

    select *
    into current_proposal
    from public.coaching_adjustment_proposals
    where id = p_current_proposal_id
    for update;

    if not found then
        raise exception 'Current Plan Adjustment proposal was not found.';
    end if;

    select *
    into user_message
    from public.coaching_adjustment_messages
    where id = p_user_message_id;

    if not found
       or user_message.role <> 'user'
       or user_message.weekly_checkin_id <> current_proposal.weekly_checkin_id
       or user_message.coaching_plan_id <> current_proposal.coaching_plan_id then
        raise exception
            'Plan Adjustment user message does not belong to the current proposal context.';
    end if;

    -- Idempotent retry path. A committed reply means this user turn is done.
    select *
    into existing_reply
    from public.coaching_adjustment_messages
    where in_reply_to_message_id = p_user_message_id
      and role = 'coach'
    order by created_at desc, id desc
    limit 1;

    if found then
        select *
        into existing_proposal
        from public.coaching_adjustment_proposals
        where id = existing_reply.proposal_id;

        return jsonb_build_object(
            'proposal', to_jsonb(existing_proposal),
            'message', to_jsonb(existing_reply),
            'revised',
                existing_proposal.id <> current_proposal.id
                or existing_proposal.revision_number > current_proposal.revision_number,
            'cached', true
        );
    end if;

    if current_proposal.status <> 'proposed' then
        raise exception
            'The Plan Adjustment proposal is no longer open for discussion.';
    end if;

    if should_revise then
        update public.coaching_adjustment_proposals
        set status = 'superseded'
        where id = current_proposal.id;

        insert into public.coaching_adjustment_proposals (
            coaching_plan_id,
            weekly_checkin_id,
            weekly_coach_review_id,
            based_on_target_id,
            revision_number,
            supersedes_proposal_id,
            decision_type,
            action_id,
            status,
            proposed_calorie_target,
            proposed_protein_grams,
            proposed_carb_grams,
            proposed_fat_grams,
            proposed_weekly_cardio_target_minutes,
            proposed_weekly_workout_target,
            proposed_daily_water_goal_oz,
            proposed_cardio_intensity_target,
            proposed_nutrition_ownership,
            proposed_effective_date,
            reason_codes,
            user_explanation,
            policy_version,
            rules_version,
            contract_version
        )
        values (
            current_proposal.coaching_plan_id,
            current_proposal.weekly_checkin_id,
            current_proposal.weekly_coach_review_id,
            current_proposal.based_on_target_id,
            current_proposal.revision_number + 1,
            current_proposal.id,
            p_revision ->> 'decision_type',
            p_revision ->> 'action_id',
            'proposed',
            nullif(p_revision ->> 'proposed_calorie_target', '')::smallint,
            nullif(p_revision ->> 'proposed_protein_grams', '')::smallint,
            nullif(p_revision ->> 'proposed_carb_grams', '')::smallint,
            nullif(p_revision ->> 'proposed_fat_grams', '')::smallint,
            nullif(p_revision ->> 'proposed_weekly_cardio_target_minutes', '')::smallint,
            nullif(p_revision ->> 'proposed_weekly_workout_target', '')::integer,
            nullif(p_revision ->> 'proposed_daily_water_goal_oz', '')::smallint,
            nullif(p_revision ->> 'proposed_cardio_intensity_target', ''),
            nullif(p_revision ->> 'proposed_nutrition_ownership', ''),
            current_proposal.proposed_effective_date,
            coalesce(
                array(
                    select jsonb_array_elements_text(
                        coalesce(p_revision -> 'reason_codes', '[]'::jsonb)
                    )
                ),
                '{}'::text[]
            ),
            p_coach_reply,
            p_revision ->> 'policy_version',
            p_revision ->> 'rules_version',
            p_revision ->> 'contract_version'
        )
        returning * into resulting_proposal;
    else
        resulting_proposal := current_proposal;
    end if;

    insert into public.coaching_adjustment_messages (
        coaching_plan_id,
        weekly_checkin_id,
        proposal_id,
        role,
        content,
        in_reply_to_message_id
    )
    values (
        current_proposal.coaching_plan_id,
        current_proposal.weekly_checkin_id,
        resulting_proposal.id,
        'coach',
        p_coach_reply,
        p_user_message_id
    )
    returning * into coach_message;

    return jsonb_build_object(
        'proposal', to_jsonb(resulting_proposal),
        'message', to_jsonb(coach_message),
        'revised', should_revise,
        'cached', false
    );
end;
$$;

revoke all
on function public.finalize_coaching_adjustment_turn(uuid, uuid, text, jsonb)
from public, anon, authenticated;

grant execute
on function public.finalize_coaching_adjustment_turn(uuid, uuid, text, jsonb)
to service_role;

comment on function
    public.finalize_coaching_adjustment_turn(uuid, uuid, text, jsonb)
is 'Atomically finalizes one BB Plan Adjustment conversation turn. Optionally supersedes the open proposal with one validated deterministic legal-action revision and always appends the coach reply. Idempotent by in_reply_to_message_id.';

commit;
