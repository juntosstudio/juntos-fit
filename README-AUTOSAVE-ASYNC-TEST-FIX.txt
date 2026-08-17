Juntos Fit — Autosave async test fix

TEST-ONLY patch.

Why the tests started failing:
Daily/Start wizard navigation used to be synchronous in the page tests.
Autosave intentionally makes navigation asynchronous because Next/Back/Exit
may wait for saveDraft() before changing screens.

The failing tests were clicking Next several times and immediately looking
for the next button/screen before the mocked autosave promise had resolved.

Changes:
- StartCheckInPage tests now await autosaving wizard navigation.
- DailyCheckInPage multi-step tests also await navigation so they stay robust
  whenever a Daily draft exists.
- One new useStartCheckIn autosave test now waits for the Start draft itself
  to finish loading rather than checking the initial loading=false state.

No production files changed.
No DB push.
No deploy.

Run:
    npm run test:run
