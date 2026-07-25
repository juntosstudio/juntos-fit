# Shared Wizard UI — Phase 3 Clean Fields + Weekly

Final clean-field decision:

- Question headings are unboxed.
- Field labels are unboxed.
- Only the actual input or textarea has a border/glow.
- No surrounding answer card appears around number,
  date, text, or textarea controls.

Weekly-only screens now use WizardQuestion:

- Your Week at a Glance
- Recovery & Context
- Weekly Measurements
- Body Fat / Body Fat Estimate
- Menstrual Cycle Context
- Progress Photos
- Weekly Reflection

Weekly measurements and scale body fat now use the
shared full-width WizardNumberField.

Files replaced:

- src/components/wizard/WizardFields.jsx
- src/styles/wizard.css
- src/components/checkin/WeeklyCheckInStep.jsx
- src/pages/WeeklyCheckInPage.jsx

No hooks, services, workflow, validation, saving, photo
scheduling, or database behavior changed.
