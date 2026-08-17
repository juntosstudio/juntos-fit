Juntos Fit — Daily edit back-label fix

Problem:
Historical Daily edits opened from Daily Check-Ins returned to Daily Check-Ins,
but the shared wizard button still said “Back to Dashboard.”

Fix:
DailyCheckInPage now passes its existing completionReturnLabel into WizardPage.
Historical edit flow therefore shows “Back to Daily Check-Ins.”
Normal Dashboard Daily flow still shows “Back to Dashboard.”

Includes a regression test.

No DB push.
Frontend build/deploy only.
