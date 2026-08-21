/*
======================================================
20260821123200_bb_adjustment_proposals.sql

Purpose:
    Stores every Big Brain adjustment proposal and
    revision, including the frozen proposed
    prescription, reason/version metadata, acceptance
    or rejection, effective date, and resulting target.
======================================================
*/

begin;
/******************************************************************************
    5. Adjustment proposals and revisions
******************************************************************************/

create table if not exists
public.coaching_adjustment_proposals (

    id uuid primary key
        default gen_random_uuid(),

    coaching_plan_id uuid not null
        references public.coaching_plans(id)
        on delete cascade,

    weekly_checkin_id uuid not null
        references public.weekly_checkins(id)
        on delete cascade,

    weekly_coach_review_id uuid
        references public.weekly_coach_reviews(id)
        on delete set null,

    -- Prescription that was active when this proposal was formed.
    based_on_target_id uuid
        references public.coaching_plan_targets(id)
        on delete set null,

    revision_number integer not null,

    supersedes_proposal_id uuid
        references public.coaching_adjustment_proposals(id)
        on delete set null,

    decision_type text not null,

    -- Deterministic legal-action identifier supplied to BB.
    action_id text not null,

    status text not null
        default 'proposed',

    -- Frozen prescription proposed to the user. HOLD proposals copy
    -- the current values so the exact recommendation is preserved.
    proposed_calorie_target smallint,
    proposed_protein_grams smallint,
    proposed_carb_grams smallint,
    proposed_fat_grams smallint,
    proposed_weekly_cardio_target_minutes smallint,
    proposed_weekly_workout_target integer,
    proposed_daily_water_goal_oz smallint,
    proposed_cardio_intensity_target text,
    proposed_nutrition_ownership text,

    proposed_effective_date date,

    reason_codes text[] not null
        default '{}'::text[],

    user_explanation text,

    -- Frozen versions used to produce this decision.
    policy_version text not null,
    rules_version text not null,
    contract_version text not null,

    expires_at timestamptz,

    accepted_at timestamptz,
    declined_at timestamptz,

    -- Actual effective date after acceptance. For HOLD this is the
    -- date the frozen no-change recommendation is accepted.
    effective_date date,

    -- Populated for an accepted material prescription change.
    applied_target_id uuid
        references public.coaching_plan_targets(id)
        on delete set null,

    resolution_reason_code text,
    resolution_note text,

    created_at timestamptz not null
        default now(),

    updated_at timestamptz not null
        default now(),

    constraint
        coaching_adjustment_proposals_week_revision_unique
        unique (
            weekly_checkin_id,
            revision_number
        ),

    constraint
        coaching_adjustment_proposals_revision_valid
        check (revision_number >= 1),

    constraint
        coaching_adjustment_proposals_not_self_superseding
        check (
            supersedes_proposal_id is null
            or supersedes_proposal_id <> id
        ),

    constraint
        coaching_adjustment_proposals_decision_type_valid
        check (
            decision_type in (
                'hold',
                'recommend_change'
            )
        ),

    constraint
        coaching_adjustment_proposals_status_valid
        check (
            status in (
                'proposed',
                'accepted',
                'declined',
                'superseded',
                'expired'
            )
        ),

    constraint
        coaching_adjustment_proposals_targets_valid
        check (
            (
                proposed_calorie_target is null
                or proposed_calorie_target > 0
            )
            and (
                proposed_protein_grams is null
                or proposed_protein_grams >= 0
            )
            and (
                proposed_carb_grams is null
                or proposed_carb_grams >= 0
            )
            and (
                proposed_fat_grams is null
                or proposed_fat_grams >= 0
            )
            and (
                proposed_weekly_cardio_target_minutes is null
                or proposed_weekly_cardio_target_minutes >= 0
            )
            and (
                proposed_weekly_workout_target is null
                or proposed_weekly_workout_target >= 0
            )
            and (
                proposed_daily_water_goal_oz is null
                or proposed_daily_water_goal_oz > 0
            )
        ),

    constraint
        coaching_adjustment_proposals_cardio_intensity_valid
        check (
            proposed_cardio_intensity_target is null
            or proposed_cardio_intensity_target in (
                'easy',
                'moderate',
                'hard'
            )
        ),

    constraint
        coaching_adjustment_proposals_nutrition_ownership_valid
        check (
            proposed_nutrition_ownership is null
            or proposed_nutrition_ownership in (
                'juntos_managed',
                'self_managed'
            )
        ),

    constraint
        coaching_adjustment_proposals_resolution_consistent
        check (
            (
                status = 'accepted'
                and accepted_at is not null
                and declined_at is null
                and effective_date is not null
                and (
                    (
                        decision_type = 'hold'
                        and applied_target_id is null
                    )
                    or (
                        decision_type = 'recommend_change'
                        and applied_target_id is not null
                    )
                )
            )
            or (
                status = 'declined'
                and declined_at is not null
                and accepted_at is null
                and effective_date is null
                and applied_target_id is null
            )
            or (
                status in (
                    'proposed',
                    'superseded',
                    'expired'
                )
                and accepted_at is null
                and declined_at is null
                and effective_date is null
                and applied_target_id is null
            )
        ),

    constraint
        coaching_adjustment_proposals_applied_target_consistent
        check (
            applied_target_id is null
            or (
                status = 'accepted'
                and decision_type = 'recommend_change'
            )
        )
);

create unique index if not exists
    coaching_adjustment_proposals_applied_target_unique_idx
on public.coaching_adjustment_proposals (
    applied_target_id
)
where applied_target_id is not null;

create index if not exists
    coaching_adjustment_proposals_plan_created_idx
on public.coaching_adjustment_proposals (
    coaching_plan_id,
    created_at desc
);

create index if not exists
    coaching_adjustment_proposals_week_status_idx
on public.coaching_adjustment_proposals (
    weekly_checkin_id,
    status,
    revision_number desc
);

create or replace function
public.validate_coaching_adjustment_proposal_links()
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
            'Adjustment proposal Weekly Check-In must belong to the same coaching plan.';
    end if;

    if new.weekly_coach_review_id is not null
       and not exists (
           select 1
           from public.weekly_coach_reviews as review
           where review.id = new.weekly_coach_review_id
             and review.weekly_checkin_id = new.weekly_checkin_id
             and review.coaching_plan_id = new.coaching_plan_id
       ) then
        raise exception
            'Adjustment proposal Coach Review must belong to the same Weekly Check-In and coaching plan.';
    end if;

    if new.based_on_target_id is not null
       and not exists (
           select 1
           from public.coaching_plan_targets as target
           where target.id = new.based_on_target_id
             and target.coaching_plan_id = new.coaching_plan_id
       ) then
        raise exception
            'Adjustment proposal base target must belong to the same coaching plan.';
    end if;

    if new.supersedes_proposal_id is not null
       and not exists (
           select 1
           from public.coaching_adjustment_proposals as prior
           where prior.id = new.supersedes_proposal_id
             and prior.weekly_checkin_id = new.weekly_checkin_id
             and prior.coaching_plan_id = new.coaching_plan_id
             and prior.revision_number < new.revision_number
       ) then
        raise exception
            'Superseded proposal must be an earlier revision for the same Weekly Check-In and coaching plan.';
    end if;

    if new.applied_target_id is not null
       and not exists (
           select 1
           from public.coaching_plan_targets as target
           where target.id = new.applied_target_id
             and target.coaching_plan_id = new.coaching_plan_id
       ) then
        raise exception
            'Applied target must belong to the same coaching plan as the accepted proposal.';
    end if;

    return new;
end;
$$;

drop trigger if exists
    coaching_adjustment_proposals_validate_links
on public.coaching_adjustment_proposals;

create trigger
    coaching_adjustment_proposals_validate_links
before insert or update of
    coaching_plan_id,
    weekly_checkin_id,
    weekly_coach_review_id,
    based_on_target_id,
    supersedes_proposal_id,
    revision_number,
    applied_target_id
on public.coaching_adjustment_proposals
for each row
execute function
    public.validate_coaching_adjustment_proposal_links();

alter table public.coaching_adjustment_proposals
    enable row level security;

create policy
    "Users can view their own coaching adjustment proposals"
on public.coaching_adjustment_proposals
for select
to authenticated
using (
    exists (
        select 1
        from public.coaching_plans as plan
        where plan.id = coaching_plan_id
          and plan.user_id =
              (select auth.uid())
    )
);

create trigger
    coaching_adjustment_proposals_set_updated_at
before update
on public.coaching_adjustment_proposals
for each row
execute function public.set_updated_at();

comment on table
    public.coaching_adjustment_proposals
is 'Immutable recommendation revisions plus their lifecycle resolution. Preserves every proposed HOLD/change, why it was proposed, whether it was accepted/declined/superseded/expired, and which target was created when a change was accepted.';


grant select
on table public.coaching_adjustment_proposals
to authenticated;

revoke insert, update, delete
on table public.coaching_adjustment_proposals
from authenticated;

revoke all
on table public.coaching_adjustment_proposals
from anon;

grant select, insert, update
on table public.coaching_adjustment_proposals
to service_role;

commit;
