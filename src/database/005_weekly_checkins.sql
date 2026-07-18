/*
======================================================
003_weekly_checkins.sql

Purpose:
    Stores weekly body measurements, body-fat
    estimates, and questions submitted during a
    coaching plan.

Relationships:
    coaching_plans (1) ---- (*) weekly_checkins
    daily_checkins (1) ---- (0..1) weekly_checkins

Notes:
    A weekly check-in belongs to a specific numbered
    week within a coaching plan.

    Week 1 becomes available seven full days after
    the coaching plan's official start date.

    The scheduled check-in date is calculated from
    the coaching plan start date and week number:

        start_date + (week_number * 7 days)

    A late submission still belongs to its original
    numbered week and does not move future check-ins.

    The linked daily check-in supplies the check-in
    date and morning weight. Body measurements are
    stored in inches.

    Scale body fat is entered from the user's scale.
    Navy body fat is calculated using profile and
    measurement data.

Author:
    Deborah Reyna

Created:
    2026-07-17

======================================================
*/

create table public.weekly_checkins (

    id uuid primary key
        default gen_random_uuid(),

    -- The coaching plan this weekly check-in belongs to.
    coaching_plan_id uuid not null
        references public.coaching_plans(id)
        on delete cascade,

    -- The daily check-in associated with this weekly check-in.
    -- This supplies the check-in date and morning weight.
    daily_checkin_id uuid not null
        unique
        references public.daily_checkins(id)
        on delete cascade,

    -- The completed program week.
    -- Week 1 becomes available seven days after the plan starts.
    week_number smallint not null
        check (week_number > 0),

    -- The actual date and time the weekly check-in was submitted.
    submitted_at timestamptz not null
        default now(),

    -- Neck circumference in inches.
    neck numeric(5,2)
        check (neck > 0),

    -- Right flexed arm circumference in inches.
    right_arm numeric(5,2)
        check (right_arm > 0),

    -- Left flexed arm circumference in inches.
    left_arm numeric(5,2)
        check (left_arm > 0),

    -- Chest circumference in inches.
    chest numeric(5,2)
        check (chest > 0),

    -- Waist circumference in inches.
    waist numeric(5,2)
        check (waist > 0),

    -- Hip circumference in inches.
    hips numeric(5,2)
        check (hips > 0),

    -- Right thigh circumference in inches.
    right_thigh numeric(5,2)
        check (right_thigh > 0),

    -- Left thigh circumference in inches.
    left_thigh numeric(5,2)
        check (left_thigh > 0),

    -- Right calf circumference in inches.
    right_calf numeric(5,2)
        check (right_calf > 0),

    -- Left calf circumference in inches.
    left_calf numeric(5,2)
        check (left_calf > 0),

    -- Body-fat percentage reported by the user's scale.
    scale_body_fat numeric(5,2)
        check (
            scale_body_fat >= 0
            and scale_body_fat <= 100
        ),

    -- Body-fat percentage calculated using the Navy method.
    navy_body_fat numeric(5,2)
        check (
            navy_body_fat >= 0
            and navy_body_fat <= 100
        ),

    -- Questions or concerns the user wants the coach to address.
    questions_for_coach text,

    created_at timestamptz not null
        default now(),

    updated_at timestamptz not null
        default now(),

    -- Prevents more than one weekly check-in from being
    -- submitted for the same coaching-plan week.
    constraint weekly_checkins_plan_week_unique
        unique (coaching_plan_id, week_number)

);

/******************************************************************************
    Row Level Security
******************************************************************************/

alter table public.weekly_checkins
    enable row level security;

/******************************************************************************
    Policies
******************************************************************************/

/******************************************************************************
    Triggers
******************************************************************************/

-- Validates that the linked daily check-in belongs to the same
-- coaching plan, that the week exists within the program, and
-- that the weekly check-in is not completed before it is due.
create or replace function public.validate_weekly_checkin_schedule()
returns trigger
language plpgsql
set search_path = public
as $$
declare
    daily_plan_id uuid;
    daily_checkin_date date;
    plan_start_date date;
    plan_length_weeks smallint;
    scheduled_checkin_date date;
begin
    select
        dc.coaching_plan_id,
        dc.checkin_date,
        cp.start_date,
        cp.program_length_weeks
    into
        daily_plan_id,
        daily_checkin_date,
        plan_start_date,
        plan_length_weeks
    from public.daily_checkins dc
    join public.coaching_plans cp
        on cp.id = new.coaching_plan_id
    where dc.id = new.daily_checkin_id;

    if not found then
        raise exception
            'The coaching plan or linked daily check-in does not exist.';
    end if;

    if daily_plan_id <> new.coaching_plan_id then
        raise exception
            'The daily check-in must belong to the same coaching plan as the weekly check-in.';
    end if;

    if new.week_number > plan_length_weeks then
        raise exception
            'Week % exceeds the coaching plan length of % weeks.',
            new.week_number,
            plan_length_weeks;
    end if;

    scheduled_checkin_date :=
        plan_start_date + (new.week_number * 7);

    if daily_checkin_date < scheduled_checkin_date then
        raise exception
            'Week % cannot be submitted before its scheduled date of %.',
            new.week_number,
            scheduled_checkin_date;
    end if;

    return new;
end;
$$;

create trigger weekly_checkins_validate_schedule
before insert or update of
    coaching_plan_id,
    daily_checkin_id,
    week_number
on public.weekly_checkins
for each row
execute function public.validate_weekly_checkin_schedule();

/******************************************************************************
    Indexes
******************************************************************************/