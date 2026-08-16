# Juntos Fit — Check-In History + Weekly Preflight v0.1

This patch adds the first real Check-In History and connects the already-defined missed-check-in rules to the Weekly flow.

## What changes

- **Progress** now opens **Check-In History** instead of the placeholder page.
- History is grouped by program week and shows real Daily and Weekly records, missing dates, no-data resolutions, today, and upcoming dates.
- Completed historical check-ins are **read-only** and can be expanded to view the saved answers.
- A missing Daily Check-In can be completed only while its program week is still eligible under the existing catch-up rules.
- A missing Daily may instead be marked **I Don't Have This Data**. This is stored separately; it does **not** fabricate a Daily Check-In row.
- On a real scheduled Weekly Check-In date, Juntos runs a **Before We Close Week N** preflight. Missing Daily dates must be completed or marked no-data before Weekly opens.
- Historical catch-up saves the original `checkin_date` and original `review_date`; it does not pretend the answer was entered today.
- Old closed missing dates remain visible but cannot be changed.
- Expired Weekly dates with no Weekly record display as **Missed**; no fake Weekly record is created.
- Older Daily rows that happened on a Weekly date before Weekly existed remain visible rather than being hidden.

## Files added/replaced

- `src/App.jsx`
- `src/hooks/useCatchUpDailyCheckIn.js`
- `src/pages/CatchUpDailyCheckInPage.jsx`
- `src/pages/CheckInHistoryPage.jsx`
- `src/pages/WeeklyPreflightPage.jsx`
- `src/services/checkInHistoryService.js`
- `src/services/dailyCheckInService.js`
- `src/styles/checkInHistory.css`
- `supabase/migrations/20260815000200_checkin_day_resolutions.sql`

This patch intentionally does **not** replace Weekly Summary, the Brain/coach review files, Dashboard, Weekly Check-In, or the existing catch-up rules/tests.

## Install

From `C:\FitnessCoach\App`:

```powershell
Expand-Archive -Path .\juntos-fit-checkin-history-preflight-v01.zip -DestinationPath . -Force
npx supabase db push
npm run build
```

Then run/deploy the app the same way you normally do.

## Expected behavior tomorrow

When the scheduled Weekly button is tapped:

1. If all prior Daily dates for that week are resolved, Weekly opens normally.
2. If any prior Daily dates are missing, Juntos shows the preflight first.
3. Each missing date can be completed with the Daily wizard or explicitly marked no-data.
4. Once zero unresolved dates remain, Juntos opens the real Weekly Check-In.

The off-schedule DEV Weekly preview still bypasses the preflight so the existing preview workflow is not disturbed.
