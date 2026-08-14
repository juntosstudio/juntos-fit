# Weekly Cardio Default-Zero Highlight

Fixes Weekly Check-In so the default cardio value `0` is selected when
the field is tapped/clicked.

Safari can place the caret after the initial focus event, so Weekly now
re-selects the default zero after focus/click/pointer handling completes.

Expected result:

- Weekly cardio opens as `0`.
- Tap/click the field.
- `0` highlights.
- Type `30` -> `30`, not `030`.

This does not affect Daily Check-In and requires no database migration.
