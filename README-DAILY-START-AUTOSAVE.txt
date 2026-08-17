Juntos Fit — Daily + Start Check-In autosave

Key design choice
-----------------
Daily autosave does NOT write partial rows into daily_checkins.

Why:
The current app treats the existence of a daily_checkins row as a completed
Daily in several places (Dashboard/streak, Current Week, history/preflight,
Plan Progress). A partial row there would falsely count as completed.

Instead this patch adds:
    public.daily_checkin_drafts

It stores:
- exact draft form JSON
- resume step
- plan/date

The real daily_checkins row is still created only by final Submit Check-In.
After successful final submission, the separate draft is deleted.

Daily behavior
--------------
- Incomplete current Daily shows “Autosave is on”.
- Top action becomes “Exit Check-In”.
- Valid Next navigation autosaves before advancing once progress exists.
- Back / review navigation autosave once a draft exists.
- Exit autosaves dirty/in-progress work before leaving.
- Reopening restores exact form and resume position.
- Completed/historical edits remain deliberate manual “Save Changes”.
- DEV preview remains non-persistent.
- Final Submit remains explicit and creates the actual Daily row.

Start behavior
--------------
Start already has a real status='draft' row, so no second Start table is needed.
The migration adds draft_data + resume_step to start_checkins.

- Incomplete Start shows “Autosave is on”.
- “Save Progress” is removed because it is now redundant.
- Top action becomes “Exit Check-In”.
- Next / Back / Exit save exact draft wizard state.
- Reopening resumes where the user left off.
- Photos continue saving immediately through the existing photo service.
- Final “Complete Start Check-In” remains explicit.
- Completed Start edits remain manual “Save Changes”.

Install order
-------------
1. Extract into project root.
2. Run tests:
       npm run test:run
3. Push the migration:
       npm run db:push
4. Build/deploy frontend normally.

No Edge Function deploy required.

Suggested live checks
---------------------
Daily:
1. Start today’s Daily.
2. Answer Weight, tap Next, then Exit Check-In.
3. Reopen Daily: it should say Continue Daily Check-In and resume where saved.
4. Confirm Dashboard/streak/history did NOT count it as completed.
5. Finish + Submit; then confirm it counts normally.

Start:
Use a test account/plan on Start Day if possible.
1. Enter a couple answers.
2. Exit Check-In.
3. Reopen and verify answers + resume step.
4. Complete normally.
