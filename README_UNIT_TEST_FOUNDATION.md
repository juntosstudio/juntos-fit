# Juntos Fit — Unit Test Foundation

This patch deliberately does NOT change the GUI or database yet.

It creates the first pure business-rules layer for missed Daily / Weekly
Check-Ins and locks the agreed behavior with unit tests before React or
Supabase are wired to it.

## Added

- Vitest 4.1
- `npm test` — watch mode
- `npm run test:run` — entire suite once
- `npm run test:rules` — missed-check-in rules only
- `src/utils/checkInCatchUpRules.js`
- `src/utils/checkInCatchUpRules.test.js`

The rules layer has no React, no Supabase, and no system clock.

Covered rules:
- Weekly grace = 3 calendar days.
- Weekly is due on its scheduled date, overdue for 3 days, expired after that.
- Missed Daily can only be backfilled while that week remains open.
- Today's check-in is not missed.
- Future dates cannot be backfilled.
- Weekly day is not offered as a separate Daily catch-up.
- Missing days can be resolved without fabricating data.
- Unresolved Daily days block Weekly.
- Weekly due today is a primary Today action, not a missed item.
- Once Weekly is overdue, it joins `Missed Check-Ins (#)`.
- Expired Weekly is no longer offered as a catch-up button.
- Expired Weekly triggers missed-week recovery.
- Submitted Weekly can be corrected for the rest of its local submission day.
- After local midnight it should finalize.

## Install

Extract over:

`C:\FitnessCoach\App`

Then run:

```powershell
npm install
npm run test:rules
```

Expected: all tests pass.

No SQL in this patch.

The next pass can wire the tested rules to database states, Dashboard
`Missed Check-Ins (#)`, Catch Up, and Weekly preflight.
