# Remove “Your Week at a Glance”

Replaces:

- src/utils/weeklyCheckInFlow.js
- src/components/checkin/WeeklyCheckInStep.jsx
- src/pages/WeeklyCheckInPage.jsx
- src/styles/weeklyCheckIn.css

Changes:

- Removes the standalone “Your Week at a Glance”
  screen from the Weekly Check-In step list.
- The question count and progress bar update
  automatically.
- After the Daily questions, the wizard proceeds
  directly to Recovery & Context.
- Removes the unused screen component, helper
  functions, prop plumbing, and screen-specific CSS.
- The final Review Weekly Check-In screen is unchanged.

No form answers, validation, saving, hooks, services,
database behavior, measurements, photos, or final-review
content changed.
