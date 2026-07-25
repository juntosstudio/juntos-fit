# Shared Wizard UI — Phase 2B

This corrects the shared presentation system before Weekly is migrated.

## Canonical design decision

Create Plan is now the question-screen reference:

- Question heading and helper text are unboxed.
- Answer controls carry the border and glow.
- Number/text answer cards span the available question width.
- Input fields expand while units remain fixed on the right.
- Required controls breathe.
- Answered controls retain a steady orange glow.
- Review sections remain card-based.

## Canonical names

- `WizardQuestion.jsx`
- `wizardFieldState.js`

Temporary compatibility files remain as tiny re-export shims:

- `WizardQuestionCard.jsx`
- `wizardUi.js`

They contain no duplicate implementation and can be deleted during final
cleanup after every wizard uses the canonical imports.

## Files added or replaced

- Shared wizard components
- `src/styles/wizard.css`
- `src/utils/wizardFieldState.js`
- `src/utils/wizardUi.js`
- `src/components/checkin/DailyCheckInStep.jsx`

## Unchanged

- Daily branching
- Validation
- Preview behavior
- Editing and save behavior
- Hooks and services
- Supabase and database code
