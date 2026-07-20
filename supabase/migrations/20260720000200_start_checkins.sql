/*
======================================================
20260720000200_start_checkins.sql

Purpose:
    Stores the physical baseline completed at the
    beginning of one coaching plan.

Relationships:
    coaching_plans (1) ---- (0..1) start_checkins

Notes:
    Each coaching plan may have only one Start
    Check-In.

    Draft rows may be incomplete. A completed row
    must contain all required measurements and the
    chosen side-photo view.

    Progress-photo records and Supabase Storage are
    added in a separate migration.

Author:
    Deborah Reyna

Created:
    2026-07-20
======================================================
*/

create table public.start_checkins (

    id uuid primary key
        default gen_random_uuid(),

    -- The coaching plan this baseline belongs to.
    coaching_plan_id uuid not null
        references public.coaching_plans(id)
        on delete cascade,

    -- The date represented by this Start Check-In.
    checkin_date date not null
        default current_date,

    -- Allows an in-progress baseline to remain separate
    -- from a completed Start Check-In.
    status text not null
        default 'draft',

    -- Starting weight in pounds.
    starting_weight_lbs numeric(5,1),

    -- Optional body-fat estimate reported by a scale.
    scale_body_fat_percent numeric(4,1),

    -- Circumference measurements in inches.
    neck_inches numeric(5,2),
    chest_inches numeric(5,2),
    waist_inches numeric(5,2),
    hips_inches numeric(5,2),

    right_upper_arm_inches numeric(5,2),
    left_upper_arm_inches numeric(5,2),

    right_thigh_inches numeric(5,2),
    left_thigh_inches numeric(5,2),

    right_calf_inches numeric(5,2),
    left_calf_inches numeric(5,2),

    -- The side used for this plan's standardized
    -- progress photos.
    side_photo_view text,

    completed_at timestamptz,

    created_at timestamptz not null
        default now(),

    updated_at timestamptz not null
        default now(),

    -- Only one Start Check-In may exist per plan.
    constraint start_checkins_plan_unique
        unique (coaching_plan_id),

    constraint start_checkins_status_valid
        check (
            status in (
                'draft',
                'completed'
            )
        ),

    constraint start_checkins_side_photo_view_valid
        check (
            side_photo_view is null
            or side_photo_view in (
                'left',
                'right'
            )
        ),

    constraint start_checkins_weight_positive
        check (
            starting_weight_lbs is null
            or starting_weight_lbs > 0
        ),

    constraint start_checkins_body_fat_valid
        check (
            scale_body_fat_percent is null
            or scale_body_fat_percent
                between 0.1 and 100
        ),

    constraint start_checkins_measurements_positive
        check (
            coalesce(neck_inches, 1) > 0
            and coalesce(chest_inches, 1) > 0
            and coalesce(waist_inches, 1) > 0
            and coalesce(hips_inches, 1) > 0
            and coalesce(
                right_upper_arm_inches,
                1
            ) > 0
            and coalesce(
                left_upper_arm_inches,
                1
            ) > 0
            and coalesce(
                right_thigh_inches,
                1
            ) > 0
            and coalesce(
                left_thigh_inches,
                1
            ) > 0
            and coalesce(
                right_calf_inches,
                1
            ) > 0
            and coalesce(
                left_calf_inches,
                1
            ) > 0
        ),

    -- Completed baselines must contain every required
    -- measurement. Scale body-fat remains optional.
    constraint start_checkins_completed_fields_present
        check (
            status = 'draft'
            or (
                starting_weight_lbs is not null
                and neck_inches is not null
                and chest_inches is not null
                and waist_inches is not null
                and hips_inches is not null
                and right_upper_arm_inches
                    is not null
                and left_upper_arm_inches
                    is not null
                and right_thigh_inches
                    is not null
                and left_thigh_inches
                    is not null
                and right_calf_inches
                    is not null
                and left_calf_inches
                    is not null
                and side_photo_view is not null
            )
        ),

    constraint start_checkins_completion_consistency
        check (
            (
                status = 'draft'
                and completed_at is null
            )
            or
            (
                status = 'completed'
                and completed_at is not null
            )
        )

);

/******************************************************************************
    Row Level Security
******************************************************************************/

alter table public.start_checkins
    enable row level security;

/******************************************************************************
    Policies
******************************************************************************/

create policy "Users can view their own start check-ins"
on public.start_checkins
for select
to authenticated
using (
    exists (
        select 1
        from public.coaching_plans
        where coaching_plans.id =
            start_checkins.coaching_plan_id
          and coaching_plans.user_id =
            (select auth.uid())
    )
);

create policy "Users can create their own start check-ins"
on public.start_checkins
for insert
to authenticated
with check (
    exists (
        select 1
        from public.coaching_plans
        where coaching_plans.id =
            start_checkins.coaching_plan_id
          and coaching_plans.user_id =
            (select auth.uid())
    )
);

create policy "Users can update their own start check-ins"
on public.start_checkins
for update
to authenticated
using (
    exists (
        select 1
        from public.coaching_plans
        where coaching_plans.id =
            start_checkins.coaching_plan_id
          and coaching_plans.user_id =
            (select auth.uid())
    )
)
with check (
    exists (
        select 1
        from public.coaching_plans
        where coaching_plans.id =
            start_checkins.coaching_plan_id
          and coaching_plans.user_id =
            (select auth.uid())
    )
);

/******************************************************************************
    Trigger
******************************************************************************/

create trigger start_checkins_set_updated_at
before update on public.start_checkins
for each row
execute function public.set_updated_at();

/******************************************************************************
    Data API Grants
******************************************************************************/

grant select, insert, update
on table public.start_checkins
to authenticated;

/******************************************************************************
    Comments
******************************************************************************/

comment on table public.start_checkins
is 'Stores one physical baseline for each coaching plan.';

comment on column public.start_checkins.side_photo_view
is 'The standardized side-photo direction: left or right.';

comment on column public.start_checkins.scale_body_fat_percent
is 'Optional body-fat estimate reported by the user''s scale.';
