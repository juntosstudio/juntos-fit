# Shared Wizard UI — Phase 2: Daily Check-In

## Files replaced

- `src/pages/DailyCheckInPage.jsx`
- `src/components/checkin/DailyCheckInStep.jsx`
- `src/components/checkin/DailyCheckInReview.jsx`
- `src/components/wizard/WizardFields.jsx`

## What changed

Daily Check-In now uses the Phase 1 shared presentation system:

- Questions sit fully inside the question card.
- Required number, text, choice, and slider answers breathe.
- Answered controls retain a steady orange confirmation glow.
- Textareas and input cards use intentional maximum widths.
- The final review uses shared review sections and rows.
- Back/Next uses the shared action layout.
- The existing weight autofocus is preserved.

## What did not change

- Daily step order
- Branching logic
- Validation rules
- Preview availability
- Existing-check-in editing
- Quick Save behavior
- Submission behavior
- Hook or service code
- Supabase or database code

## Weekly note

Weekly Check-In currently embeds `DailyCheckInStep` for its daily questions.
Those embedded questions will therefore inherit the improved shared Daily
presentation now. Weekly-only screens remain unchanged until Phase 3.

## Test checklist

1. Open the Daily DEV preview.
2. Confirm every question title is fully inside the card.
3. Confirm unanswered required controls breathe.
4. Confirm selected/answered controls keep a steady glow.
5. Confirm optional coach text boxes remain neutral when blank.
6. Confirm the meal-plan, workout, training-problem, and alcohol branches
   still appear only when expected.
7. Confirm Back and Next preserve answers.
8. Confirm the final review matches the shared review-card style.
9. Do not submit real data until the visual and flow test is complete.
