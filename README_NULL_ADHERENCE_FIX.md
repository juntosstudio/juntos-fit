# Juntos Fit — Week at a Glance Null Adherence Fix

Install this AFTER the Week at a Glance feedback patch.

Fix:
- No adherence data now displays `—` in the normal neutral color.
- A real 0% adherence value still displays `0%` and remains red.
- Existing green/amber/red thresholds are unchanged.

Extract into:
C:\FitnessCoach\App

Then:
npm run build
npm run dev
