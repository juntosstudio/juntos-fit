import { useMemo, useState } from 'react'
import { DailyCheckInStep } from '../components/checkin/DailyCheckInStep'
import { DailyCheckInReview } from '../components/checkin/DailyCheckInReview'
import { useDailyCheckIn } from '../hooks/useDailyCheckIn'
import { useWizardFocus } from '../hooks/useWizardFocus'
import {
  DAILY_CHECKIN_STEP_IDS as STEP,
  getDailyCheckInSteps,
} from '../utils/dailyCheckInFlow'
import { formatDate } from '../utils/formatters'

// Returns whether the current question has a valid answer.
function canContinueFromStep(step, form) {
  if (step === STEP.WEIGHT) {
    if (!form.weight_status) return false

    if (form.weight_status === 'recorded') {
      const weight = Number(form.morning_weight)

      return Number.isFinite(weight) && weight > 0
    }

    return true
  }

  if (step === STEP.MEAL_PLAN_SCORE) {
    return form.meal_plan_score !== ''
  }

  if (step === STEP.MEAL_PLAN_DEVIATION) {
    return Boolean(
      form.meal_plan_deviation_details.trim(),
    )
  }

  if (step === STEP.CHEAT_MEAL) {
    return Boolean(form.planned_cheat_meal_status)
  }

  if (step === STEP.HUNGER) {
    return form.hunger_score !== ''
  }

  if (step === STEP.WATER) {
    return form.water_goal_met !== null
  }

  if (step === STEP.WORKOUT_STATUS) {
    return Boolean(form.workout_status)
  }

  if (step === STEP.WORKOUT_INCOMPLETE_REASON) {
    return Boolean(
      form.workout_incomplete_reason.trim(),
    )
  }

  if (step === STEP.TRAINING_PROBLEM) {
    return form.training_problem !== null
  }

  if (step === STEP.TRAINING_PROBLEM_DETAILS) {
    return Boolean(
      form.training_problem_details.trim(),
    )
  }

  if (step === STEP.CARDIO) {
    if (form.cardio_minutes === '') return false

    const minutes = Number(form.cardio_minutes)

    return (
      Number.isInteger(minutes) &&
      minutes >= 0 &&
      minutes <= 1440
    )
  }

  if (step === STEP.ALCOHOL) {
    return form.alcohol_consumed !== null
  }

  if (step === STEP.ALCOHOL_DETAILS) {
    return Boolean(form.alcohol_details.trim())
  }

  // The final two text questions are optional.
  return true
}

// Displays the guided, one-question-at-a-time check-in.
export function DailyCheckInPage({
  plan,
  target,
  cardioCompleted,
  onSaved,
  onBack,
}) {
  const {
    today,
    firstCheckInDate,
    form,
    existingCheckIn,
    isDirty,
    loading,
    saving,
    error,
    successMessage,
    canEdit,
    planHasStarted,
    setField,
    saveCheckIn,
  } = useDailyCheckIn(plan, onSaved)

  const [currentStep, setCurrentStep] = useState(
    STEP.WEIGHT,
  )
  const [reviewing, setReviewing] = useState(false)
  const [completionType, setCompletionType] =
    useState(null)
  const [previewing, setPreviewing] = useState(false)

  const steps = useMemo(
    () => getDailyCheckInSteps(form),
    [form],
  )

  const currentStepIndex = steps.indexOf(currentStep)

  const safeStepIndex =
    currentStepIndex >= 0 ? currentStepIndex : 0

  const activeStep =
    steps[safeStepIndex] ?? STEP.WEIGHT

  const {
    markForwardNavigation,
    markBackNavigation,
  } = useWizardFocus({
    stepKey: `${activeStep}:${form.weight_status ?? ''}`,
    rootId: 'daily-checkin-wizard-step',
    reviewing,
    disabled: Boolean(completionType),
  })

  const previewAvailable =
    import.meta.env.DEV && !planHasStarted

  const wizardAvailable = canEdit || previewing

  const isEditing =
    Boolean(existingCheckIn) && !previewing

  const pageTitle = isEditing
    ? 'Update Daily Check-In'
    : 'Daily Check-In'

  const reviewTitle = isEditing
    ? 'Review Your Changes'
    : 'Review Your Answers'

  function goNext() {
    if (!canContinueFromStep(activeStep, form)) {
      return
    }

    const nextStep = steps[safeStepIndex + 1]

    markForwardNavigation()

    if (!nextStep) {
      setReviewing(true)
      return
    }

    setCurrentStep(nextStep)
  }

  function goBack() {
    markBackNavigation()

    if (reviewing) {
      setReviewing(false)
      setCurrentStep(steps.at(-1) ?? STEP.WEIGHT)
      return
    }

    const previousStep = steps[safeStepIndex - 1]

    if (previousStep) {
      setCurrentStep(previousStep)
    }
  }

  // Saves immediately when editing, unless a newly required answer is missing.
  async function handleSave() {
    if (previewing) return

    const firstInvalidStep = steps.find(
      (step) => !canContinueFromStep(step, form),
    )

    if (firstInvalidStep) {
      markForwardNavigation()
      setReviewing(false)
      setCurrentStep(firstInvalidStep)
      return
    }

    const wasUpdate = Boolean(existingCheckIn)
    const saved = await saveCheckIn()

    if (saved) {
      setCompletionType(
        wasUpdate ? 'updated' : 'saved',
      )
    }
  }

  function startPreview() {
    markForwardNavigation()
    setPreviewing(true)
    setCurrentStep(STEP.WEIGHT)
    setReviewing(false)
    setCompletionType(null)
  }

  const confirmationDialog = completionType ? (
    <div className="confirmation-overlay">
      <section
        className="confirmation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
      >
        <div
          className="confirmation-checkmark"
          aria-hidden="true"
        >
          ✓
        </div>

        <h2 id="confirmation-title">
          {completionType === 'updated'
            ? 'Check-In Updated'
            : 'Check-In Saved'}
        </h2>

        <p>
          {completionType === 'updated'
            ? 'Your changes have been saved. Keep up the good work.'
            : 'Nice work showing up today. Keep following the plan—you’ve got this.'}
        </p>

        <button type="button" onClick={onBack}>
          Back to Dashboard
        </button>
      </section>
    </div>
  ) : null

  if (loading) {
    return (
      <main className="container">
        <button type="button" onClick={onBack}>
          Back to Dashboard
        </button>

        <h1>Daily Check-In</h1>
        <p>Loading today’s check-in...</p>
      </main>
    )
  }

  if (!plan) {
    return (
      <main className="container">
        <button type="button" onClick={onBack}>
          Back to Dashboard
        </button>

        <h1>Daily Check-In</h1>

        <p role="alert">
          No active coaching plan was found.
        </p>
      </main>
    )
  }

  if (!wizardAvailable) {
    return (
      <main className="container">
        <button type="button" onClick={onBack}>
          Back to Dashboard
        </button>

        <h1>Daily Check-In</h1>

        <p>
          Daily check-ins begin the morning after your
          program starts.
        </p>

        <p>
          Your first check-in is{' '}
          <strong>
            {formatDate(firstCheckInDate)}
          </strong>
          .
        </p>

        {previewAvailable && (
          <button type="button" onClick={startPreview}>
            Preview Check-In Wizard
          </button>
        )}
      </main>
    )
  }

  if (reviewing) {
    return (
      <>
        <main className="container">
          <button type="button" onClick={onBack}>
            Back to Dashboard
          </button>

          <h1>{reviewTitle}</h1>

          <DailyCheckInReview
            form={form}
            target={target}
            today={today}
          />

          {(error || successMessage) && (
            <p role={error ? 'alert' : 'status'}>
              {error || successMessage}
            </p>
          )}

          <div className="wizard-actions">
            <button
              type="button"
              disabled={saving}
              onClick={goBack}
            >
              Edit Answers
            </button>

            <button
              type="button"
              disabled={
                saving ||
                previewing ||
                (isEditing && !isDirty)
              }
              onClick={handleSave}
            >
              {saving
                ? 'Saving...'
                : isEditing
                  ? 'Save Changes'
                  : 'Submit Check-In'}
            </button>
          </div>

          {previewing && (
            <p role="status">
              Preview mode — nothing can be submitted.
            </p>
          )}
        </main>

        {confirmationDialog}
      </>
    )
  }

  const progress =
    ((safeStepIndex + 1) / steps.length) * 100

  return (
    <>
      <main className="container">
        <button type="button" onClick={onBack}>
          Back to Dashboard
        </button>

        <h1>{pageTitle}</h1>
        <p>{formatDate(today)}</p>

        {previewing && (
          <p role="status">
            Preview mode — answers cannot be submitted.
          </p>
        )}

        {isEditing && (
          <p>
            Change only what you need, then save your
            changes.
          </p>
        )}

        {(error || successMessage) && (
          <p role={error ? 'alert' : 'status'}>
            {error || successMessage}
          </p>
        )}

        <progress
          max="100"
          value={progress}
          aria-label="Check-in progress"
        />

        <p>
          Question {safeStepIndex + 1} of {steps.length}
        </p>

        <div id="daily-checkin-wizard-step">
          <DailyCheckInStep
            step={activeStep}
          form={form}
          setField={setField}
          target={target}
            cardioCompleted={cardioCompleted}
          />
        </div>

        <div className="wizard-actions">
          <button
            type="button"
            disabled={safeStepIndex === 0}
            onClick={goBack}
          >
            Back
          </button>

          <button
            type="button"
            disabled={
              !canContinueFromStep(activeStep, form)
            }
            onClick={goNext}
          >
            {safeStepIndex === steps.length - 1
              ? isEditing
                ? 'Review Changes'
                : 'Review Answers'
              : 'Next'}
          </button>
        </div>

        {isEditing && (
          <div className="quick-save-action">
            <button
              type="button"
              disabled={saving || !isDirty}
              onClick={handleSave}
            >
              {saving
                ? 'Saving...'
                : 'Save Changes'}
            </button>
          </div>
        )}
      </main>

      {confirmationDialog}
    </>
  )
}