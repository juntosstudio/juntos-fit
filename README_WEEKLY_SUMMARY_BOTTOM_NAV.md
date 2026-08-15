# Juntos Fit — Weekly Summary Bottom Navigation

Weekly Summary is a read-only app page, not a focused check-in wizard, so it now
uses the same persistent main navigation as Today / Plan / Settings.

Behavior:
- Keeps `← Back to Today` at the top.
- Adds the fixed bottom navigation:
  Today · Progress · Plan · Coach · Settings
- Today is highlighted because Weekly Summary is a drill-down from Today.
- Tapping Today returns to the Dashboard.
- Progress, Plan, and Settings navigate normally.
- Coach remains disabled exactly as it is elsewhere.
- Adds extra bottom padding so the fixed navigation never covers the end of the
  long Weekly Summary.

There is intentionally no second `Back to Today` button at the bottom because
the fixed Today navigation is always available while scrolling.

Install over:
C:\FitnessCoach\App

Then:
npm run build
npm run dev

No SQL.
No npm install.
