/*
======================================================
20260816085200_weekly_coach_service_role_grants.sql

Purpose:
    Give the trusted server-side Weekly Coach Edge
    Function the narrow table privileges it actually
    needs.

Why:
    The service_role was missing SELECT privileges.
    Fixing coaching_plans exposed the next missing
    privilege on daily_checkins. Rather than discover
    these one table at a time, this migration covers
    every table currently read by the Weekly Coach
    packet/repository code.

Security:
    - Grants only to service_role.
    - Does not grant anything to anon.
    - Does not change authenticated-user grants.
    - Does not alter RLS policies.
    - weekly_coach_reviews also needs INSERT/UPDATE
      because the function persists the generated
      review there.
======================================================
*/

grant select on table
    public.coaching_plans,
    public.daily_checkins,
    public.profiles,
    public.user_settings,
    public.start_checkins,
    public.coaching_plan_targets,
    public.weekly_plan_prescriptions,
    public.weekly_checkins
to service_role;

grant select, insert, update on table
    public.weekly_coach_reviews
to service_role;
