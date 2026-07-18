/*
======================================================
007_coaching_plans.sql

Purpose:
    Stores each coaching program assigned to a user,
    including the program start date, weekly check-in
    schedule, goal, and overall status.

Relationships:
    profiles (1) ---- (*) coaching_plans

Notes:
    A user may have multiple coaching plans over time.
    Only one plan may be active at a time.

    The start date determines the permanent weekly
    check-in weekday for the coaching plan. Missing or
    submitting a check-in late does not move the
    program schedule.

    Nutrition targets, workouts, check-ins, progress
    photos, and coach adjustments are stored in
    separate tables.

Author:
    Deborah Reyna

Created:
    2026-07-17

======================================================
*/

create table public.coaching_plans (

    id uuid primary key
        default gen_random_uuid(),

    -- The user this coaching plan belongs to.
    user_id uuid not null
        references public.profiles(id)
        on delete cascade,

    -- The official start date of the coaching plan.
    -- This date never changes if a check-in is submitted late.
    start_date date not null,

    -- The fixed weekly check-in day for this coaching plan.
    -- 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday,
    -- 4 = Thursday, 5 = Friday, 6 = Saturday.
    checkin_day smallint not null
        check (checkin_day between 0 and 6),

    -- The planned duration of the coaching program.
    program_length_weeks smallint not null
        check (program_length_weeks > 0),

    -- The overall goal of the coaching plan.
    goal text not null
        check (goal in ('fat_loss', 'maintenance', 'muscle_gain')),

    -- Indicates whether this coaching plan is currently active.
    status text not null
        default 'active'
        check (status in ('active', 'completed', 'cancelled')),

    -- The date the coaching plan ended, if applicable.
    end_date date,

    created_at timestamptz not null
        default now(),

    updated_at timestamptz not null
        default now(),

    -- Ensures the stored check-in day matches the weekday
    -- of the coaching plan's official start date.
    constraint coaching_plans_checkin_day_matches_start
        check (
            extract(dow from start_date)::smallint = checkin_day
        ),

    -- Ensures the end date cannot occur before the start date.
    constraint coaching_plans_end_date_valid
        check (
            end_date is null
            or end_date >= start_date
        )

);

/******************************************************************************
    Row Level Security
******************************************************************************/

alter table public.coaching_plans
    enable row level security;

/******************************************************************************
    Policies
******************************************************************************/

/******************************************************************************
    Triggers
******************************************************************************/

/******************************************************************************
    Indexes
******************************************************************************/

-- Supports retrieving all coaching plans belonging to a user.
create index coaching_plans_user_id_idx
    on public.coaching_plans(user_id);

-- Ensures a user cannot have more than one active coaching plan.
create unique index coaching_plans_one_active_per_user_idx
    on public.coaching_plans(user_id)
    where status = 'active';