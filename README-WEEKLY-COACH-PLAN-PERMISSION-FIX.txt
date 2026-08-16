Juntos Fit — Weekly Coach coaching_plans permission fix

What changed:
- Keeps caller authentication through the signed-in user JWT.
- Uses the already-created service-role/admin Supabase client for the
  server-side coaching_plans ownership lookup.
- Explicitly compares coaching_plans.user_id to the authenticated user.
- Does NOT grant authenticated users direct SELECT access to coaching_plans.

Install:
1. Extract this ZIP into the app/project root and overwrite.
2. Deploy only the Edge Function:
   npx supabase functions deploy generate-weekly-coach-review
3. No database migration / db push is required.
4. No frontend rebuild is required.
5. Retry the saved Week 3 Coach Review.
