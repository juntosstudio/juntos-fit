# Juntos Fit — Neutral Initial 0% Fix

Install this AFTER the previous Week at a Glance patches.

Behavior:
- No meal-plan adherence data yet -> displays `0%` in the normal neutral color.
- Real adherence data -> uses the existing thresholds:
  - 80–100% green
  - 60–79% amber
  - below 60% red

This preserves the clean initial dashboard while keeping the card numerically consistent.

Extract into:
C:\FitnessCoach\App

Then:
npm run build
npm run dev
