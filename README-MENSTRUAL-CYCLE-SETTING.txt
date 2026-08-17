Juntos Fit — Menstrual Cycle Context setting

What this patch does
--------------------
1. Adds user_settings.track_menstrual_cycle_context
   - boolean
   - NOT NULL
   - default FALSE (opt-in)

2. Check-In Settings
   - Only female profiles see:
     “Do you want to track menstrual cycle context?”
   - Yes enables the optional Weekly menstrual-context question.
   - No hides it.

3. Weekly Check-In
   - Female + setting ON: menstrual context step remains in the Weekly.
   - Setting OFF or non-female: the menstrual context step is removed.
   - The tracking choice is snapshotted into the Weekly draft the first time
     that Weekly is opened. Changing Settings later does not reshape an
     already-started Weekly.
   - If that draft's snapshotted choice is OFF, any hidden menstrual-context
     value is cleared so it cannot be submitted accidentally.
   - Completed Weekly history remains frozen; historical answers are not changed.

4. Tests
   - Settings normalization verifies opt-in default OFF.
   - Settings service verifies the new field is loaded/saved.
   - Weekly page verifies the menstrual step is hidden OFF and retained ON.
   - Also fixes the stale Weekly test click label from “Save & Exit”
     to the already-shipped “Exit Check-In”.

Install / run
-------------
Extract into project root, then:

    npm run test:run
    npx supabase db push

IMPORTANT:
Push the DB migration before deploying the frontend, because the settings
service will select the new column.

No Edge Function deploy is required.
