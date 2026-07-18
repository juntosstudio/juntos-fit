/*
======================================================
007_data_api_grants.sql

Purpose:
    Grants the authenticated Supabase Data API role
    access to the core coaching tables.

Relationships:
    Works together with the Row Level Security
    policies defined for each table.

Notes:
    Database grants determine which operations the
    authenticated role may attempt.

    Row Level Security policies determine which
    individual records the authenticated user may
    access.

    Coaching plans and coaching-plan targets remain
    read-only through the client application during
    the initial beta.

Author:
    Deborah Reyna

Created:
    2026-07-17

======================================================
*/

/******************************************************************************
    Schema Access
******************************************************************************/

-- Allows authenticated API users to access objects in public.
grant usage on schema public
    to authenticated;

/******************************************************************************
    Profile Grants
******************************************************************************/

-- Users may view, create, and update their own profile,
-- subject to the profiles RLS policies.
grant select, insert, update
    on table public.profiles
    to authenticated;

/******************************************************************************
    Coaching Plan Grants
******************************************************************************/

-- Coaching plans are read-only through the beta application.
grant select
    on table public.coaching_plans
    to authenticated;

/******************************************************************************
    Coaching Plan Target Grants
******************************************************************************/

-- Coaching-plan targets are read-only through the beta application.
grant select
    on table public.coaching_plan_targets
    to authenticated;

/******************************************************************************
    Daily Check-In Grants
******************************************************************************/

-- Users may view, create, and update their own daily check-ins,
-- subject to the daily_checkins RLS policies.
grant select, insert, update
    on table public.daily_checkins
    to authenticated;

/******************************************************************************
    Weekly Check-In Grants
******************************************************************************/

-- Users may view, create, and update their own weekly check-ins,
-- subject to the weekly_checkins RLS policies.
grant select, insert, update
    on table public.weekly_checkins
    to authenticated;

/******************************************************************************
    Anonymous Access
******************************************************************************/

-- The application requires authentication before accessing coaching data.
revoke all
    on table public.profiles,
             public.coaching_plans,
             public.coaching_plan_targets,
             public.daily_checkins,
             public.weekly_checkins
    from anon;