# Juntos Fit — Plan Tab Polish

Install this after Plan Tab V1.

Changes:
- `Deb’s Current Plan` is now inside a bordered, rounded selector box so it visually reads as a dropdown.
- The Plan page now calculates the end date from `start_date + (program_length_weeks * 7 days)` when `coaching_plans.end_date` is empty.
- If a stored `end_date` exists, it still takes precedence.

No SQL migration is required.

Extract into:
C:\FitnessCoach\App

Then run:
npm run build
npm run dev
