/*
======================================================
002_daily_checkins.sql

Purpose:
    Stores daily fitness, nutrition, training, cardio,
    weight, hunger, and alcohol check-in information
    for a coaching plan.

Relationships:
    coaching_plans (1) ---- (*) daily_checkins

Notes:
    Each daily check-in belongs to one coaching plan.

    Only one daily check-in may be recorded for a
    coaching plan on a given calendar date.

    Weekly check-ins may reference a daily check-in
    to reuse its check-in date and morning weight.

Author:
    Deborah Reyna

Created:
    2026-07-17

======================================================
*/

create table public.daily_checkins (

    id uuid primary key
        default gen_random_uuid(),

    -- The coaching plan this daily check-in belongs to.
    coaching_plan_id uuid not null
        references public.coaching_plans(id)
        on delete cascade,

    -- The calendar date represented by this check-in.
    checkin_date date not null
        default current_date,

    -- The user's morning body weight in pounds.
    morning_weight numeric(5,1),

    -- Indicates why a morning weight may be missing.
    weight_status text not null
        default 'recorded',

    -- Meal-plan adherence score from 1 through 5.
    meal_plan_score smallint,

    -- Indicates whether the user experienced meaningful hunger.
    hunger boolean,

    -- Indicates whether the planned workout was completed,
    -- missed, or whether the day was a scheduled rest day.
    workout_status text,

    -- Total cardio minutes completed during the day.
    cardio_minutes smallint not null
        default 0,

    -- Type and amount of alcohol consumed, if applicable.
    alcohol_details text,

    -- Training problems, pain, difficulty, or other concerns.
    training_problems text,

    -- Questions the user wants the coach to address.
    questions_for_coach text,

    created_at timestamptz not null
        default now(),

    updated_at timestamptz not null
        default now(),

    -- Only one daily check-in may exist for a coaching plan
    -- on a given calendar date.
    constraint daily_checkins_plan_date_unique
        unique (coaching_plan_id, checkin_date),

    -- Weight must be greater than zero when entered.
    constraint daily_checkins_weight_positive
        check (
            morning_weight is null
            or morning_weight > 0
        ),

    -- Allowed values when a morning weight is not recorded.
    constraint daily_checkins_weight_status_valid
        check (
            weight_status in (
                'recorded',
                'traveling',
                'no_scale',
                'scale_issue',
                'skipped'
            )
        ),

    -- Weight and weight status must agree.
    constraint daily_checkins_weight_consistency
        check (
            (
                weight_status = 'recorded'
                and morning_weight is not null
            )
            or
            (
                weight_status <> 'recorded'
                and morning_weight is null
            )
        ),

    -- Meal-plan adherence must be between 1 and 5.
    constraint daily_checkins_meal_plan_score_range
        check (
            meal_plan_score is null
            or meal_plan_score between 1 and 5
        ),

    -- Workout status must be a valid option.
    constraint daily_checkins_workout_status_valid
        check (
            workout_status is null
            or workout_status in (
                'completed',
                'rest_day',
                'missed'
            )
        ),

    -- Cardio minutes must be a realistic daily value.
    constraint daily_checkins_cardio_minutes_valid
        check (
            cardio_minutes between 0 and 1440
        )

);

/******************************************************************************
    Row Level Security
******************************************************************************/

alter table public.daily_checkins
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