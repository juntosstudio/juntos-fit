# Daily Check-In Flow Reorder

## New order

1. Morning weight
2. Meal-plan adherence
3. Meal-plan deviation type, when adherence is 1–4
4. Deviation explanation only when needed
5. Hunger
6. Workout
7. Workout branch questions
8. Cardio
9. Water
10. Alcohol
11. Alcohol details when needed
12. One combined coach-notes question

## Meal-plan branch

For adherence scores 1–4:

- Planned cheat meal was the only deviation
  - skip the text explanation
- Planned cheat meal plus other deviations
  - ask what else was different
- Deviations did not include a planned cheat meal
  - ask what was different

The new three-option answer is represented in the UI by the
form-only `meal_plan_deviation_type` value. It maps back into the
existing database fields:

- `planned_cheat_meal_status`
- `meal_plan_deviation_details`

No database migration is required.

## Coach notes

The previous “anything else” and “questions for coach” screens
are combined into one optional question. The answer is stored in
the existing `additional_notes` database column. Existing values
from both old columns are combined when an older check-in loads.

## Weekly

Weekly reuses `getDailyCheckInSteps`, `canContinueDailyStep`, and
`DailyCheckInStep`, so its Daily-question section automatically
inherits this new order and branching.
