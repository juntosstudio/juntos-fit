import {
  useMemo,
  useState,
} from 'react'
import {
  WizardActions,
  WizardPage,
} from '../components/wizard'
import {
  DailyCheckInStep,
} from '../components/checkin/DailyCheckInStep'
import {
  DailyCheckInReview,
} from '../components/checkin/DailyCheckInReview'
import {
  useDailyCheckIn,
} from '../hooks/useDailyCheckIn'
import {
  useWizardFocus,
} from '../hooks/useWizardFocus'
import {
  DAILY_CHECKIN_STEP_IDS as STEP,
  getDailyCheckInSteps,
} from '../utils/dailyCheckInFlow'
import {
  formatDate,
} from '../utils/formatters'
import '../styles/wizard.css'

// Returns whether the current question has a valid answer.
function canContinueFromStep(step, form) {
  if (step === STEP.WEIGHT) {
    if (!form.weight_status) return false

    if (
      form.weight_status === 'recorded'
    ) {
      const weight = Number(
        form.morning_weight,
      )

      return (
        Number.isFinite(weight) &&
        weight > 0
      )
    }

    return true
  }

  if (step === STEP.MEAL_PLAN_SCORE) {
    return form.meal_plan_score !== ''
  }

  if (
    step === STEP.MEAL_PLAN_DEVIATION
  ) {
    return Boolean(
      form
        .meal_plan_deviation_details
        .trim(),
    )
  }

  if (step === STEP.CHEAT_MEAL) {
    return Boolean(
      form.planned_cheat_meal_status,
    )
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

  if (
    step ===
    STEP.WORKOUT_INCOMPLETE_REASON
  ) {
    return Boolean(
      form
        .workout_incomplete_reason
        .trim(),
    )
  }

  if (
    step === STEP.TRAINING_PROBLEM
  ) {
    return (
      form.training_problem !== null
    )
  }

  if (
    step ===
    STEP.TRAINING_PROBLEM_DETAILS
  ) {
    return Boolean(
      form
        .training_problem_details
        .trim(),
    )
  }

  if (step === STEP.CARDIO) {
    if (form.cardio_minutes === '') {
      return false
    }

    const minutes = Number(
      form.cardio_minutes,
    )

    return (
      Number.isInteger(minutes) &&
      minutes >= 0 &&
      minutes <= 1440
    )
  }

  if (step === STEP.ALCOHOL) {
    return (
      form.alcohol_consumed !== null
    )
  }

  if (
    step === STEP.ALCOHOL_DETAILS
  ) {
    return Boolean(
      form.alcohol_details.trim(),
    )
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

  const [
    currentStep,
    setCurrentStep,
  ] = useState(STEP.WEIGHT)

  const [reviewing, setReviewing] =
    useState(false)

  const [
    completionType,
    setCompletionType,
  ] = useState(null)

  const [previewing, setPreviewing] =
    useState(false)

  const steps = useMemo(
    () => getDailyCheckInSteps(form),
    [form],
  )

  const currentStepIndex =
    steps.indexOf(currentStep)

  const safeStepIndex =
    currentStepIndex >= 0
      ? currentStepIndex
      : 0

  const activeStep =
    steps[safeStepIndex] ?? STEP.WEIGHT

  const {
    markForwardNavigation,
    markBackNavigation,
  } = useWizardFocus({
    stepKey: `${activeStep}:${
      form.weight_status ?? ''
    }`,
    rootId:
      'daily-checkin-wizard-step',
    reviewing,
    disabled: Boolean(completionType),
  })

  const previewAvailable =
    import.meta.env.DEV &&
    !planHasStarted

  const wizardAvailable =
    canEdit || previewing

  const isEditing =
    Boolean(existingCheckIn) &&
    !previewing

  const pageTitle = isEditing
    ? 'Update Daily Check-In'
    : 'Daily Check-In'

  const reviewTitle = isEditing
    ? 'Review Your Changes'
    : 'Review Your Answers'

  function goNext() {
    if (
      !canContinueFromStep(
        activeStep,
        form,
      )
    ) {
      return
    }

    const nextStep =
      steps[safeStepIndex + 1]

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
      setCurrentStep(
        steps.at(-1) ?? STEP.WEIGHT,
      )
      return
    }

    const previousStep =
      steps[safeStepIndex - 1]

    if (previousStep) {
      setCurrentStep(previousStep)
    }
  }

  // Saves immediately when editing, unless a newly
  // required answer is missing.
  async function handleSave() {
    if (previewing) return

    const firstInvalidStep = steps.find(
      (step) =>
        !canContinueFromStep(
          step,
          form,
        ),
    )

    if (firstInvalidStep) {
      markForwardNavigation()
      setReviewing(false)
      setCurrentStep(
        firstInvalidStep,
      )
      return
    }

    const wasUpdate =
      Boolean(existingCheckIn)

    const saved = await saveCheckIn()

    if (saved) {
      setCompletionType(
        wasUpdate
          ? 'updated'
          : 'saved',
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

  const confirmationDialog =
    completionType ? (
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

          <button
            type="button"
            onClick={onBack}
          >
            Back to Dashboard
          </button>
        </section>
      </div>
    ) : null

  if (loading) {
    return (
      <WizardPage
        className="daily-checkin-page"
        title="Daily Check-In"
        onBack={onBack}
      >
        <p>
          Loading today’s check-in...
        </p>
      </WizardPage>
    )
  }

  if (!plan) {
    return (
      <WizardPage
        className="daily-checkin-page"
        title="Daily Check-In"
        onBack={onBack}
      >
        <p role="alert">
          No active coaching plan was
          found.
        </p>
      </WizardPage>
    )
  }

  if (!wizardAvailable) {
    return (
      <WizardPage
        className="daily-checkin-page"
        title="Daily Check-In"
        onBack={onBack}
      >
        <p>
          Daily check-ins begin the
          morning after your program
          starts.
        </p>

        <p>
          Your first check-in is{' '}
          <strong>
            {formatDate(
              firstCheckInDate,
            )}
          </strong>
          .
        </p>

        {previewAvailable && (
          <button
            type="button"
            onClick={startPreview}
          >
            Preview Check-In Wizard
          </button>
        )}
      </WizardPage>
    )
  }

  const feedback =
    error || successMessage ? (
      <p
        role={
          error ? 'alert' : 'status'
        }
      >
        {error || successMessage}
      </p>
    ) : null

  if (reviewing) {
    return (
      <>
        <WizardPage
          className="daily-checkin-page"
          title={reviewTitle}
          onBack={onBack}
          status={feedback}
          actions={
            <WizardActions
              backLabel="Edit Answers"
              nextLabel={
                saving
                  ? 'Saving...'
                  : isEditing
                    ? 'Save Changes'
                    : 'Submit Check-In'
              }
              busy={saving}
              nextDisabled={
                previewing ||
                (isEditing &&
                  !isDirty)
              }
              onBack={goBack}
              onNext={handleSave}
            />
          }
          footer={
            previewing ? (
              <p role="status">
                Preview mode — nothing
                can be submitted.
              </p>
            ) : null
          }
        >
          <DailyCheckInReview
            form={form}
            target={target}
            today={today}
          />
        </WizardPage>

        {confirmationDialog}
      </>
    )
  }

  const progress =
    ((safeStepIndex + 1) /
      steps.length) *
    100

  const pageStatus = (
    <>
      {previewing && (
        <p role="status">
          Preview mode — answers cannot
          be submitted.
        </p>
      )}

      {isEditing && (
        <p>
          Change only what you need,
          then save your changes.
        </p>
      )}

      {feedback}
    </>
  )

  const reviewButtonLabel =
    safeStepIndex ===
    steps.length - 1
      ? isEditing
        ? 'Review Changes'
        : 'Review Answers'
      : 'Next'

  return (
    <>
      <WizardPage
        className="daily-checkin-page"
        title={pageTitle}
        subtitle={formatDate(today)}
        status={pageStatus}
        progress={progress}
        progressLabel="Check-in progress"
        stepLabel={`Question ${
          safeStepIndex + 1
        } of ${steps.length}`}
        onBack={onBack}
        actions={
          <WizardActions
            backDisabled={
              safeStepIndex === 0
            }
            nextDisabled={
              !canContinueFromStep(
                activeStep,
                form,
              )
            }
            backLabel="Back"
            nextLabel={
              reviewButtonLabel
            }
            onBack={goBack}
            onNext={goNext}
          />
        }
        footer={
          isEditing ? (
            <div className="quick-save-action">
              <button
                type="button"
                disabled={
                  saving || !isDirty
                }
                onClick={handleSave}
              >
                {saving
                  ? 'Saving...'
                  : 'Save Changes'}
              </button>
            </div>
          ) : null
        }
      >
        <div
          id="daily-checkin-wizard-step"
        >
          <DailyCheckInStep
            step={activeStep}
            form={form}
            setField={setField}
            target={target}
            cardioCompleted={
              cardioCompleted
            }
          />
        </div>
      </WizardPage>

      {confirmationDialog}
    </>
  )
}
