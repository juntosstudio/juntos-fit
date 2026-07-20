
# Juntos Fit — Shared Wizard Focus Controller

This patch replaces separate focus behavior with one shared controller.

## Final behavior

- Opening a wizard or moving forward:
  - Empty text/number field receives the cursor.
  - Existing value is not selected.
  - Text cursor moves to the end where supported.
- Back:
  - No field receives focus.
  - No value is selected.
  - The mobile keyboard does not open automatically.
- Edit Value:
  - Returns to the exact warned field.
  - Selects the entire value for immediate replacement.

## Wizards included

- Start Check-In
- Daily Check-In
- Create Plan
- Weekly Check-In should use `useWizardFocus` when built.

## Install

Extract the entire ZIP into:

`C:\FitnessCoach\App`

Allow Windows to merge folders and replace files.

No database migration is needed.

## Test

1. Start Check-In:
   - Next into an empty field focuses it.
   - Next into a saved field does not select the value.
   - Back does not focus or select.
   - Edit Value selects the warned value.
2. Daily Check-In preview:
   - Forward navigation focuses text and number fields.
   - Back does not focus them.
3. Create Plan preview:
   - Forward navigation focuses date/number fields.
   - Back does not focus them.

Then run:

```powershell
npm run build
```
