Juntos Fit — Weekly Finalize Guard + Photo DB Cleanup

WEEKLY FINAL SUBMIT
- “Submit Weekly Check-In” now validates first, then opens a final warning.
- Warning: “You can’t change this Weekly Check-In once it’s submitted.”
- Choices: “Go Back & Review” and “Submit & Finalize.”
- submitCheckIn() runs only after “Submit & Finalize.”
- Tests cover both confirmation and cancellation.

PHOTO DB CLEANUP
- Replaces validate_progress_photo_parent().
- Weekly photo ownership now resolves through:
  weekly_checkins.coaching_plan_id -> coaching_plans.user_id.
- progress_photos.user_id remains intact and validated.

INSTALL
Extract into the project root and overwrite.

Run:
  npm test
  npx supabase db push

Then build/deploy the frontend normally.

No Edge Function redeploy is required.
