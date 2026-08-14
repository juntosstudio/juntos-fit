# Juntos Fit — Weekly Build 1: Cadence + Live Body Fat + RFM

This patch is intentionally limited to Weekly Build 1.

## What changes

- Removes the hard-coded Week 4 Weekly preview.
- Calculates the Weekly number from the plan schedule.
- Regular Weekly Check-Ins: waist only.
- Every 4th Weekly (or configured photo frequency): full measurements + photos.
- Final Weekly: full measurements + photos even when the plan length is not divisible by 4.
- Body-fat tracking becomes a live user setting:
  - Use My Scale
  - Have Juntos Fit Estimate It
  - Do Not Track Body Fat
- Create Plan seeds the initial live body-fat setting.
- Changing the setting later affects future check-ins only.
- Juntos Fit Weekly estimates use RFM v1:
  `64 - 20 * (height / waist) + 12 * sex`
  with sex = 0 male / 1 female.
- Juntos Estimate does not add a body-fat question. It is calculated from weekly waist + profile height/sex and shown in Review.
- Scale mode still asks for the scale reading.
- Weekly remains a DEV front-end preview. Nothing is submitted/saved by Weekly in this build.

## Install

Extract this ZIP into:

`C:\FitnessCoach\App`

Preserve the included `src\...` and `supabase\migrations\...` paths.

Then run:

```powershell
npx supabase db push
npm run dev
```

## Expected behavior

### Regular Weekly
- Prep
- Weight
- Scale BF only when Settings = Use My Scale
- Waist
- Daily-style questions
- Recovery/context
- Final reflection
- No full measurement/photo screens

### Weekly 4 / 8 / 12...
- Prep
- Weight
- Scale BF only when applicable
- Daily-style questions
- Recovery/context
- Neck, chest, waist, hips
- Saved-side bicep/thigh/calf
- Front / saved-side / back photos
- Final reflection

### Final Weekly
Full measurements + photos even when the final number is not a multiple of 4.

### Juntos Estimate
No BF input screen. Review shows an RFM estimate after waist is entered.
If profile height or sex is unavailable, Review says the estimate is unavailable.

## Not in this build

- Weekly autosave/drafts
- Weekly submission
- Weekly database persistence
- Real weekly photo upload
- Same-date Daily upsert
- Deferred Weekly cardio 0-selection polish
- Deferred wizard text-field autofocus polish

## Compatibility note

The existing Start Check-In body-fat estimator export is intentionally left untouched.
This patch adds RFM as a separate Weekly estimator so it does not silently change or break an already-working Start Check-In.
