/*
======================================================
008_coaching_plan_targets.sql

Purpose:
    Stores the nutrition and cardio targets assigned
    to a coaching plan.

Relationships:
    coaching_plans (1) ---- (*) coaching_plan_targets

Notes:
    A new record is created whenever the coaching
    prescription changes. Existing records are not
    overwritten, preserving the full target history.

    The active target is the most recent record whose
    effective_date is on or before the current date.

Author:
    Deborah Reyna

Created:
    2026-07-17

======================================================
*/

create table public.coaching_plan_targets (

    id uuid primary key
        default gen_random_uuid(),

    -- The coaching plan this target belongs to.
    coaching_plan_id uuid not null
        references public.coaching_plans(id)
        on delete cascade,

    -- The date this target becomes active.
    effective_date date not null,

    -- The user's daily calorie target.
    calorie_target smallint
        check (calorie_target > 0),

    -- The user's daily protein target in grams.
    protein_grams smallint
        check (protein_grams >= 0),

    -- The user's daily carbohydrate target in grams.
    carb_grams smallint
        check (carb_grams >= 0),

    -- The user's daily fat target in grams.
    fat_grams smallint
        check (fat_grams >= 0),

    -- The total number of cardio minutes prescribed per week.
    weekly_cardio_target_minutes smallint not null
        default 0
        check (weekly_cardio_target_minutes >= 0),

    created_at timestamptz not null
        default now(),

    updated_at timestamptz not null
        default now(),

    -- Prevents more than one target from becoming effective
    -- on the same date for the same coaching plan.
    unique (coaching_plan_id, effective_date)

);

/******************************************************************************
    Row Level Security
******************************************************************************/

alter table public.coaching_plan_targets
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