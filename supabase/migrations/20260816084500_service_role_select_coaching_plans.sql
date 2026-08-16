/*
======================================================
20260816084500_service_role_select_coaching_plans.sql

Purpose:
    Allow trusted server-side Supabase Edge Functions
    using the service_role key to read coaching_plans.

Why:
    generate-weekly-coach-review now verifies Weekly
    ownership through:
        weekly_checkins.coaching_plan_id
            -> coaching_plans.user_id

    The service_role currently lacks SELECT on
    public.coaching_plans, causing PostgreSQL 42501
    before the OpenAI request can be made.

Scope:
    - Grants SELECT only to service_role.
    - Does not grant access to anon.
    - Does not change RLS policies.
======================================================
*/

grant select on table public.coaching_plans to service_role;
