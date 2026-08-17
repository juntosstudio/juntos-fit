Juntos Fit — Daily Cardio Context + Brain History

WHAT THIS ADDS
==============
When cardio minutes = 0:
- Nothing extra is shown.

When cardio minutes > 0:
- Cardio Type dropdown:
    Walking
    Running / Jogging
    HIIT / Intervals
    StairMaster / Step Machine
    Cycling
    Elliptical / Rowing
    Mixed
    Other
- Effort:
    Easy
    Moderate
    Hard

LAST-USED DEFAULT
=================
For a new Daily Check-In, Juntos loads the most recent prior cardio entry
and prefills its cardio type + effort. The fields stay hidden while minutes
remain zero, so normal zero-cardio entry is not made noisier.

Weekly Check-In uses the same Daily cardio UI and also gets the same
last-used defaults.

DATABASE
========
Adds nullable daily_checkins columns:
- cardio_type
- cardio_intensity

Historical rows are NOT backfilled. We do not invent old cardio context.

Legacy Dailies that already contain cardio minutes but predate these columns
remain editable without forcing the user to guess old type/intensity.

DISPLAY
=======
Daily Review:
    20 minutes · Walking · Moderate

Current Week history:
    20 min
    Walking · Moderate

BRAIN PACKET
============
The Weekly Coach Brain still gets total cardio_minutes, plus:
- cardio_sessions
- cardio_context_entries
- cardio_by_type
- cardio_by_intensity
- cardio_entries (per-day minutes/type/intensity)

That applies to the current week AND the historical weeks already included
in the coaching packet, so the Brain can learn patterns and preferences.

IMPORTANT
=========
currentWeekService.js does NOT need a patch because it already selects
DAILY_CHECKIN_FIELDS from dailyCheckInService.js. Adding the two fields there
automatically carries them into Current Week rows.

INSTALL
=======
1. Extract this ZIP into the project root.
2. Run:
       npm run test:run
3. If green:
       npm run db:push
4. Deploy the frontend normally.
5. Because coachingPacket.ts changed, deploy the Coach Edge Function:
       npm run deploy:coach

QUICK LIVE TEST
===============
Daily:
1. Enter cardio > 0.
2. Confirm Cardio Type + Effort appear.
3. Choose Walking + Moderate and submit.
4. Open the next Daily. Enter cardio > 0 and confirm Walking + Moderate
   are already selected.
5. Confirm Current Week displays the context.

Weekly:
The shared cardio question should show the exact same fields on Weekly day.

Brain:
The next generated Weekly review will receive the richer cardio history.
