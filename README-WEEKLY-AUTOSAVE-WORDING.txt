Juntos Fit — Weekly autosave wording polish

Problem
-------
Real Weekly drafts say “Autosave is on” while the top action says “Save & Exit,”
which makes it sound like the user must manually save.

Change
------
- In a real, incomplete Weekly: “Save & Exit” -> “Exit Check-In”
- The button still performs one final saveDraft before leaving.
- DEV Preview now explicitly says:
  “Autosave is off · Nothing will be saved”
  because preview mode intentionally has persistence disabled.
- Completed Weekly behavior remains “Back to Dashboard.”
- Regression tests updated.

No DB push.
No Edge Function deploy.
Frontend build/deploy only.
