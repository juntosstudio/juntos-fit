import {
  useMemo,
  useState,
} from 'react'
import { WeeklyCheckInStep } from '../components/checkin/WeeklyCheckInStep'
import { WeeklyCheckInReview } from '../components/checkin/WeeklyCheckInReview'
import { useWeeklyCheckInPreview } from '../hooks/useWeeklyCheckInPreview'
import {
  canContinueWeeklyStep,
  getWeeklyCheckInSteps,
} from '../utils/weeklyCheckInFlow'
import { formatDate } from '../utils/formatters'
import '../styles/wizard.css'
import '../styles/weeklyCheckIn.css'

export function WeeklyCheckInPage({
  plan,
  profile,
  target,
  cardioCompleted,
  onBack,
}) {
  const {
    today,
    weekNumber,
    photosRequired,
    form,
    photos,
    setField,
    addPreviewPhoto,
    resetPreview,
  } = useWeeklyCheckInPreview(plan)

  const [stepIndex, setStepIndex] =
    useState(0)

  const [reviewing, setReviewing] =
    useState(false)

  const steps = useMemo(
    () =>
      getWeeklyCheckInSteps(form, {
        bodyFatSource:
          plan?.body_fat_source,
        sex: profile?.sex,
        photosRequired,
      }),
    [
      form,
      plan?.body_fat_source,
      profile?.sex,
      photosRequired,
    ],
  )

  const safeStepIndex = Math.min(
    stepIndex,
    Math.max(steps.length - 1, 0),
  )

  const activeStep =
    steps[safeStepIndex]

  const canContinue =
    canContinueWeeklyStep(
      activeStep,
      form,
      {
        bodyFatSource:
          plan?.body_fat_source,
        photosRequired,
        photos,
        previewMode: true,
      },
    )

  function handleNext() {
    if (!canContinue) {
      return
    }

    if (
      safeStepIndex >=
      steps.length - 1
    ) {
      setReviewing(true)
      return
    }

    setStepIndex(
      safeStepIndex + 1,
    )
  }

  function handleBack() {
    if (reviewing) {
      setReviewing(false)
      setStepIndex(
        Math.max(
          steps.length - 1,
          0,
        ),
      )
      return
    }

    setStepIndex(
      Math.max(
        safeStepIndex - 1,
        0,
      ),
    )
  }

  function startOver() {
    resetPreview()
    setReviewing(false)
    setStepIndex(0)
  }

  if (!plan) {
    return (
      <main className="container">
        <button
          type="button"
          onClick={onBack}
        >
          Back to Dashboard
        </button>

        <h1>Weekly Check-In</h1>

        <p role="alert">
          Create a plan before previewing the
          Weekly Check-In wizard.
        </p>
      </main>
    )
  }

  if (reviewing) {
    return (
      <main className="container weekly-checkin-page">
        <button
          type="button"
          onClick={onBack}
        >
          Back to Dashboard
        </button>

        <p className="weekly-preview-badge">
          DEV Preview · Nothing will be saved
        </p>

        <h1>Review Weekly Check-In</h1>

        <WeeklyCheckInReview
          form={form}
          target={target}
          today={today}
          weekNumber={weekNumber}
          plan={plan}
          photos={photos}
        />

        <div className="wizard-actions">
          <button
            type="button"
            onClick={handleBack}
          >
            Edit Answers
          </button>

          <button
            type="button"
            disabled
            title="Submission will be enabled after the database merge."
          >
            Submit Weekly Check-In
          </button>
        </div>

        <button
          type="button"
          className="text-button"
          onClick={startOver}
        >
          Restart Preview
        </button>
      </main>
    )
  }

  const progress =
    steps.length > 0
      ? ((safeStepIndex + 1) /
          steps.length) *
        100
      : 0

  return (
    <main className="container weekly-checkin-page">
      <button
        type="button"
        onClick={onBack}
      >
        Back to Dashboard
      </button>

      <p className="weekly-preview-badge">
        DEV Preview · Week 4 Example · Nothing
        will be saved
      </p>

      <h1>
        Week {weekNumber} Check-In
      </h1>

      <p>{formatDate(today)}</p>

      <progress
        max="100"
        value={progress}
        aria-label="Weekly Check-In progress"
      />

      <p className="weekly-question-count">
        Question {safeStepIndex + 1} of{' '}
        {steps.length}
      </p>

      <WeeklyCheckInStep
        step={activeStep}
        form={form}
        setField={setField}
        target={target}
        cardioCompleted={
          cardioCompleted
        }
        plan={plan}
        photos={photos}
        addPreviewPhoto={
          addPreviewPhoto
        }
      />

      <div className="wizard-actions">
        <button
          type="button"
          disabled={safeStepIndex === 0}
          onClick={handleBack}
        >
          Back
        </button>

        <button
          type="button"
          disabled={!canContinue}
          onClick={handleNext}
        >
          {safeStepIndex ===
          steps.length - 1
            ? 'Review Answers'
            : 'Next'}
        </button>
      </div>
    </main>
  )
}
