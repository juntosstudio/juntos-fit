Juntos Fit — Autosave status badge polish

Tiny UI-only fix.

Daily + Start autosave currently renders as tiny helper text.
This patch gives those autosave messages role="status", which
uses the app's existing green status treatment.

Changed:
- src/pages/DailyCheckInPage.jsx
- src/pages/StartCheckInPage.jsx

No DB push.
No Edge Function deploy.

Run:
    npm run test:run

Then deploy frontend normally.
