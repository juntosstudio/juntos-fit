Juntos Fit — Daily autosave Exit button fix

Production bug caught by the new tests.

The Daily page correctly showed “Autosave is on”, but the main wizard screen
was still passing the old Back-to-Dashboard callback/label into WizardPage.
The autosave Exit wiring had accidentally been applied to the loading state
and review state, but not the normal question screen.

This patch changes only:
    src/pages/DailyCheckInPage.jsx

Incomplete current Daily:
    Exit Check-In -> autosave -> leave

Completed/historical edit:
    keeps its existing return label/behavior

Run:
    npm run test:run

No DB push for this tiny fix itself.
Do NOT push the autosave migration until the test suite is green.
