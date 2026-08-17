Juntos Fit — Daily Pencil Edit

WHAT THIS DOES
- Enables the pencil on completed Daily rows in the current open reporting week.
- Does NOT show an edit pencil for a Weekly-completed/finalized day.
- Opens the normal Daily Check-In wizard prefilled for the selected date.
- Saves changes back to the same Daily row/date through the existing upsert key.
- Returns historical edits to Daily Check-Ins.
- Adds daily_checkins.edited_at.
- Adds a DB-level freeze so Daily rows cannot be inserted/updated after their closing Weekly is completed.
- No delete behavior is added.

REPORTING LOCK
A completed Weekly on date D freezes Daily checkin dates D-6 through D inclusive.

FILES
src/App.jsx
src/pages/CurrentWeekPage.jsx
src/styles/currentWeek.css
src/pages/DailyCheckInPage.jsx
src/pages/DailyCheckInPage.test.jsx
src/hooks/useDailyCheckIn.js
src/hooks/useDailyCheckIn.test.js
src/services/dailyCheckInService.js
src/services/dailyCheckInService.test.js
supabase/migrations/20260817110000_daily_checkin_editing.sql

INSTALL / TEST
1. Extract into the project root and overwrite.
2. Run:
     npm run test:run
3. Push DB:
     npx supabase db push
4. Build/deploy frontend normally.

LIVE TEST
- Open Daily Check-Ins.
- Tap a pencil on a completed Daily in the current open week.
- Confirm the wizard says Update Daily Check-In and shows the selected date.
- Change one answer and Save Changes.
- Return to Daily Check-Ins and confirm the row refreshes.
- Do NOT expect a pencil on a finalized Weekly day / closed week.
