Juntos Fit — service_role coaching_plans SELECT grant

Install:
1. Extract this ZIP into the Juntos Fit project root.
2. Confirm the migration lands at:
   supabase/migrations/20260816084500_service_role_select_coaching_plans.sql
3. Run:
   npx supabase db push
4. No frontend rebuild is needed.
5. No Edge Function redeploy should be needed for this grant-only migration.
6. Return to the saved Week 3 Review and click "Try Coach Review Again".

This grants SELECT on public.coaching_plans to service_role only.
