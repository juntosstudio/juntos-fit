# Juntos Fit — Weekly Summary DEV Preview

Adds a DEV-only way to view Weekly Summary before a real Weekly Check-In exists.

## What appears in DEV

On Today, under Week X at a Glance:

`Preview Previous Week Summary · DEV`

The preview:
- saves NOTHING
- creates NO weekly_checkins row
- creates NO weekly_plan_prescriptions row
- uses the real current/previous plan target history
- uses any real Daily Check-In rows that exist for that program week
- leaves Weekly-only answers blank because those do not exist yet

Once a real Weekly Check-In is completed, the normal historical summary takes over.

## Install

Extract over:

`C:\FitnessCoach\App`

Then:

```powershell
npm run build
npm run dev
```

No SQL.
No npm install.
