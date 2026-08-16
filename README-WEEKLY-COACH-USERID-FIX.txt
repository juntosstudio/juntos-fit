Juntos Fit — Weekly Coach user_id schema-drift fix

What changed:
- generate-weekly-coach-review no longer selects weekly_checkins.user_id.
- Ownership is resolved through weekly_checkins.coaching_plan_id -> coaching_plans.user_id.
- Coaching packet profile/settings lookup uses coaching_plans.user_id.
- weekly_coach_reviews.user_id is populated from the verified owning coaching plan/user, not from weekly_checkins.

Install:
1. Extract this ZIP into the app/project root and overwrite the three files.
2. Deploy the Edge Function (this is NOT a database migration):
   npx supabase functions deploy generate-weekly-coach-review
3. Return to the completed Weekly Review and click Try Coach Review Again.
4. No new Weekly submission is needed.
