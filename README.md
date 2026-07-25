# Weekly Measurement Validation

Fixes the body-fat Next-button bug and gives Weekly the same
measurement validation behavior as Start Check-In.

Files:

- src/components/checkin/questions/BodyFatQuestion.jsx
- src/components/checkin/DailyCheckInStep.jsx
- src/components/checkin/WeeklyCheckInStep.jsx
- src/pages/WeeklyCheckInPage.jsx
- src/utils/weeklyCheckInFlow.js

Changes:

- A valid entered body-fat percentage now enables Next.
- Weekly validates morning weight, scale body fat, neck,
  waist, hips, bicep, thigh, and calf using the existing
  Start Day measurement-validation utility.
- Invalid values show their message and keep Next disabled.
- Unusual but possible values show the same
  “Please Double-Check” confirmation used by Start Day.
- Confirmations are tied to the exact value; editing it
  requires another confirmation.
- A blank Weekly cardio field is no longer interpreted as 0.

No services, database schema, saving, cadence, photos, or
body-fat formula changed.
