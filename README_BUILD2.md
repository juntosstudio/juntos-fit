# Juntos Fit — Weekly Build 2: Real Save

This build turns the scheduled Weekly Check-In into a real persisted workflow.

## What this build adds

- Creates one Weekly draft on the plan's **actual scheduled Weekly Check-In date**.
- Autosaves the complete Weekly form whenever the user taps **Next** or **Back**.
- Adds **Save & Exit**.
- Reopens a draft at its saved wizard step with prior answers restored.
- Dashboard shows **Resume Weekly Check-In** while the Weekly is still a draft.
- On photo weeks, each progress photo uploads immediately and survives exit/reload.
- Review has a real **Submit Weekly Check-In** action.
- Submission upserts the same-date `daily_checkins` row with the Daily-style answers, then completes the corresponding `weekly_checkins` row with Weekly-specific data.
- Weekly saves structured measurements/recovery/body-fat source + method, while also retaining the complete final form JSON in `draft_data`.
- Completed Weekly Check-Ins reopen in read-only Review mode.
- The database prevents a photo-week Weekly from completing without front, saved-side, and back photos.

## Important safety behavior

The real persistence path activates **only on the actual scheduled Weekly date**.

On any other day, the DEV Weekly link stays a non-persistent preview. That means testing a Friday preview cannot accidentally create a fake Weekly row that interferes with the real Sunday check-in.

## Install

Extract this ZIP into:

`C:\FitnessCoach\App`

Then run:

```powershell
npx supabase db push
npm run build
npm run dev
```

## What to expect before the scheduled Weekly date

The DEV Weekly preview should still say that nothing will be saved. You can click through it, but it will not create a Weekly draft or a Daily row.

## Focused real test on the scheduled Weekly date

1. Open the real **Weekly Check-In** from Dashboard.
2. Answer a few questions and tap **Next** two or three times.
3. Tap **Save & Exit**.
4. Dashboard should now say **Resume Weekly Check-In**.
5. Reopen it. Your answers and exact wizard position should be restored.
6. Finish the Weekly and tap **Submit Weekly Check-In**.
7. Dashboard should change to **View This Week’s Check-In ✓**.
8. Reopen it. It should display the completed Review rather than an editable draft.

For the current plan, the next real check-in should be Weekly #3, so it should be a regular waist-only Weekly: no full circumference set and no progress photos. The immediate photo-persistence path will naturally be exercised on Weekly #4.

## Not changed in this build

- Daily question wording or branching.
- Build 1 Weekly cadence.
- Build 1 RFM calculation.
- Deferred Weekly cardio-zero selection polish.
- Deferred automatic text-field focus polish.

## Persistence note

Final submission is retry-safe but is not yet wrapped in one database transaction: the Daily row is upserted first, then the Weekly row is completed. If the second write fails, retrying submission safely reuses the same Daily plan/date row.
