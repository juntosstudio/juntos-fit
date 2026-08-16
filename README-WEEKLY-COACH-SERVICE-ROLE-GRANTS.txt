Juntos Fit — Weekly Coach service_role grants

This replaces the current whack-a-mole permission debugging with one tracked
migration covering every table the deployed Weekly Coach function reads.

Install:
1. Extract this ZIP into the Juntos Fit project root.
2. Confirm the migration lands at:
   supabase/migrations/20260816085200_weekly_coach_service_role_grants.sql
3. Run:
   npx supabase db push
4. No frontend rebuild is needed.
5. No Edge Function redeploy is needed for this grant-only migration.
6. Return to the already-saved Week 3 Review and click "Try Coach Review Again".

The earlier coaching_plans SELECT grant is harmless to repeat; GRANT is idempotent.
