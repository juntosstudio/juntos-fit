# Juntos Fit Shared Wizard UI — Phase 1

## Purpose

This package creates the shared presentation layer for current and future
Juntos Fit wizards. It does **not** modify any existing wizard yet.

Start Day Check-In and Create Plan are the visual reference:

- Question text sits fully inside the card.
- Required answers breathe until completed.
- Completed answers keep a smaller steady orange glow.
- Inputs are intentionally sized instead of stretching across the page.
- Review sections use one consistent card and row pattern.
- Mobile behavior is part of the shared system.

## Added files

- `src/components/wizard/WizardPage.jsx`
- `src/components/wizard/WizardQuestionCard.jsx`
- `src/components/wizard/WizardChoiceGroup.jsx`
- `src/components/wizard/WizardFields.jsx`
- `src/components/wizard/WizardSlider.jsx`
- `src/components/wizard/WizardReview.jsx`
- `src/components/wizard/WizardActions.jsx`
- `src/components/wizard/index.js`
- `src/utils/wizardUi.js`
- `src/styles/wizard.css`

## Architecture boundary

Shared wizard UI owns:

- Layout
- Question-card structure
- Field sizing
- Required/answered/warning/error presentation
- Choice cards
- Slider presentation
- Review presentation
- Back/Next layout

Each wizard continues to own:

- Step order
- Branching
- Validation rules
- Form state
- Database services
- Save/submit behavior
- Availability and locking rules

## Phase sequence

1. Add these files without importing them anywhere.
2. Convert Daily Check-In to the shared UI.
3. Test and commit Daily separately.
4. Convert Weekly Check-In.
5. Test and commit Weekly separately.
6. Convert Create Plan without changing its appearance.
7. Convert Start Day last.
8. Remove obsolete duplicate CSS only after all four are verified.

## Current behavior

Extracting this package adds new files only. Because no existing page imports
`wizard.css` or the shared components yet, the current app should render
exactly as it did before extraction.
