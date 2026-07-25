# Weekly Body Fat After Weight

Replaces:

- src/utils/weeklyCheckInFlow.js
- src/components/checkin/WeeklyCheckInStep.jsx

Scale body-fat plans:

- Body Fat now appears immediately after Morning Weight.
- The screen matches the Weight interaction:
  - blank numeric field
  - percent suffix
  - `or`
  - “I don’t have a body-fat reading today”
- Selecting no reading enables Next.
- Users can switch back to entering a reading.
- Entering a value automatically marks the reading as
  recorded.

Other plan methods:

- Juntos estimate remains after Weekly Measurements
  because it depends on those measurements.
- “Do not track body fat” shows no Body Fat step.

No review, saving, services, database behavior, or
body-fat calculation was changed.
