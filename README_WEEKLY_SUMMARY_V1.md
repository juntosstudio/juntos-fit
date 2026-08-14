# Juntos Fit — Weekly Summary V1

This is the first real completed-week report card plus the database
foundation for Homeostasis / the future coaching brain.

## Database

Adds:

`weekly_plan_prescriptions`

Important design choice:
- `coaching_plan_targets` remains the canonical versioned target history.
- When a Weekly Check-In is completed, the database automatically snapshots
  every target version that was actually active during that program week.
- A mid-week prescription change produces multiple snapshot rows.
- Each row preserves:
  - calories
  - protein / carbs / fat
  - workout target
  - cardio target
  - water target
  - effective dates
  - number of days it applied
- Existing completed Weekly Check-Ins are backfilled automatically.
- Snapshots are read-only to the authenticated user.

This gives the future coach a durable:
Prescription → Adherence → Outcome → Context
history without rewriting old weeks.

## Dashboard

Changes:
- `Week at a Glance` becomes `Week X at a Glance`.
- The old `View Weekly Summary` button becomes:
  `View Previous Week Summary`.
- It appears only when the immediately previous week has a completed
  Weekly Check-In.
- Before that, the Dashboard explains that the Weekly Check-In must be
  completed to unlock the summary.

Also fixes the program-week aggregation boundary:
- Daily questions describe the previous day.
- A Sun–Sat program week therefore uses Daily rows submitted Mon–Sun.
- The Sunday Weekly Check-In that closes Saturday no longer gets counted
  as the first day of the new week.

## Weekly Summary page

Only completed weeks appear in the dropdown.

V1 includes:

### Results
- Weekly average weight
- tiny seven-day weight sparkline
- colored up/down change
- comparison to prior weekly average
- Week 1 falls back to Start Day weight
- Waist
- colored up/down visual
- comparison to prior Weekly waist
- Week 1 falls back to Start Day waist
- Current body fat when available

Weight and waist values/deltas respect the user's Imperial/Metric setting.

Weight color is goal-aware:
- Fat Loss: down = positive, up = negative
- Muscle Gain: up = positive, down = negative
- Maintenance: approximately stable = positive

Waist:
- down = positive
- up = negative
- unchanged = neutral

### Your Prescription
Shows the actual saved calories/macros/activity/water prescription for
that completed week.

If it changed mid-week, every version is shown with the dates and number
of days it applied.

### Nutrition Report Card
- Meal Plan Adherence %
- days reported
- exact / small deviation / several deviations / significantly off /
  did-not-follow breakdown
- planned cheat-meal count when present

It explicitly does NOT invent estimated calories consumed.

### Activity
- workouts completed
- partial/missed counts when applicable
- cardio minutes
- water-goal days
- alcohol days

If a weekly activity target changed mid-week, the page does not force one
misleading target. The prescription versions above show the change.

### Recovery & Context
- sleep
- energy
- training recovery
- stress
- menstrual context when present
- weekly reflection

### Coach Review
Reserved space is included for the future saved AI coaching response.
No AI response is invented in V1.

## Install

Extract into:

`C:\FitnessCoach\App`

Run the new SQL migration in Supabase:

`supabase\migrations\20260814000300_weekly_summary_prescriptions.sql`

Then run:

```powershell
npm run build
npm run dev
```

No `npm install` is required.

## Important testing note

Weekly Summary only uses COMPLETED Weekly Check-Ins.

So:
- a draft does not appear
- a missed previous Weekly does not get a fake summary
- after a real Weekly is submitted, the Dashboard will expose
  `View Previous Week Summary`
