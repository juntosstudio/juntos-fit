Juntos Fit — Weekly draft trigger fix

Install:
1. Extract this ZIP into the app/project root.
2. Confirm the SQL file lands at:
   supabase/migrations/20260816072000_weekly_checkin_draft_schedule_validation.sql
3. Push/apply the Supabase migration.
4. No frontend rebuild is required for this SQL-only patch.
5. Reopen the real Weekly Check-In after the migration succeeds.

This patch changes only the Weekly schedule validation trigger/function.
