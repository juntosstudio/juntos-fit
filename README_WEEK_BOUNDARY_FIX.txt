Juntos Fit — Week Boundary + Program Streak Fix
2026-08-16

INSTALL
Extract this ZIP directly into the Fitness App / APP project root.
Allow it to overwrite matching files under src/.

NO DATABASE MIGRATION.
NO CSS/UI layout changes in this package.

BUSINESS RULE NOW ENCODED

There are two clocks:

1) PROGRAM / PRESCRIPTION DAYS
   Start Day begins Week 1 diet + workouts immediately.
   A new prescription week begins on each Weekly Check-In calendar day.

2) MORNING REPORTING / CHECK-IN WINDOW
   A morning check-in reports yesterday's behavior plus today's morning weight.
   The Weekly Check-In morning is the final reporting check-in for the week being closed.
   Dashboard / Plan Progress do not roll to the new reporting week until the following morning.

Example: Sunday Start + Sunday Weekly

Week 3 behavior/prescription:
  Sun Aug 9 -> Sat Aug 15

Week 3 reporting/check-ins:
  Mon Aug 10 -> Sun Aug 16 Weekly Check-In

On Sun Aug 16:
  - Week 4 diet/workouts have begun for the day.
  - Dashboard still displays Week 3 at a Glance/results being closed.
  - Current Week history is Mon Aug 10 -> Sun Aug 16 Weekly.

On Mon Aug 17:
  - Dashboard/Plan Progress switch to Week 4 reporting.
  - Week 4 at-a-glance begins fresh and Monday's check-in reports Sunday Aug 16 behavior.

STREAK RULE

Streak is program-long, not weekly.

Counts:
  - completed Start Day Check-In
  - completed Daily Check-In
  - completed/finalized/submitted Weekly Check-In

A Weekly boundary never resets the streak.
A pending check-in today does not erase the streak earned through yesterday.
Once today's check-in is completed, today is added to the same streak.
A real missing prior check-in breaks the streak.

FILES REPLACED
  src/utils/dates.js
  src/utils/planProgress.js
  src/services/dashboardService.js
  src/services/currentWeekService.js
  src/services/checkInHistoryService.js
  src/services/weeklySummaryService.js

TEST FILES UPDATED / ADDED
  src/utils/dates.test.js
  src/utils/planProgress.test.js             NEW
  src/utils/checkInStreak.js                 NEW production helper
  src/utils/checkInStreak.test.js            NEW

IMPLEMENTATION NOTES

- Reporting-week math is centralized in src/utils/dates.js.
- Dashboard, Current Week, history/preflight, Plan Progress, and Weekly Review now use the same reporting boundary helpers instead of each doing separate week math.
- getProgramWeekRange remains available as the raw Start-Day-anchored prescription/behavior week helper.
- Streak calculation is a separate pure utility so its behavior is unit-testable.

VALIDATION PERFORMED HERE

- node --check passed for every JS file in the package.
- Pure business-rule assertions passed for:
    Sun Aug 16 -> reporting Week 3
    Mon Aug 17 -> reporting Week 4
    Week 3 program range -> Aug 9-15
    Week 3 reporting range -> Aug 10-16
    pending Weekly Sunday preserves prior streak
    completed Weekly Sunday continues the streak
    a real missing day breaks the streak
- Vitest itself was not available in this sandbox, so run your normal project test suite locally after extracting.
