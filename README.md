# Weekly Check-In Flow Rebuild

This is still a DEV front-end preview. Nothing in this patch enables
Weekly submission or adds a database migration.

## Approved Week 4 preview order

1. Morning weight
2. Body fat, when tracked
3. Daily meal-plan adherence and its shared branching
4. Hunger
5. Workout and its shared branching
6. Cardio
7. Water, when enabled in Settings
8. Alcohol, when enabled in Settings
9. Recovery & Context — four sliders on one page
10. Menstrual context for female profiles
11. Neck
12. Chest
13. Waist
14. Hips
15. Saved-side bicep, thigh, and calf together
16. Progress-photo tips
17. Front photo
18. Saved-side photo
19. Back photo
20. One combined weekly reflection / coach-message question

The exact step count changes with meal-plan, workout, alcohol, body-fat,
water/alcohol Settings, and menstrual-context branches.

## Regular non-photo weeks

The flow asks Waist immediately after weight/body fat. Neck, chest, hips,
saved-side measurements, and photos are omitted. Waist is never duplicated.

## Other fixes

- Chest is restored.
- Daily coach notes are removed from Weekly because the final Weekly
  question now handles reflection, coach notes, and coach questions.
- Weekly cardio begins at 0 and selects the zero when focused.
- Recovery uses four positive-direction 1–5 sliders.
- Measurements use the same clean field treatment as Start Day.
- Photos are separate pages matching the Start Day photo-card workflow.
- Weekly Review formats measurements/body fat cleanly and includes Chest.
- Shared cardio warnings are included in Weekly.

## Install

Extract the ZIP into the app root and replace matching files.

No Supabase push or database migration is required.
