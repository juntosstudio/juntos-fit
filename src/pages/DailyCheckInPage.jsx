import {
  useEffect,
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
  useCheckInMeasurementValidation,
} from '../hooks/useCheckInMeasurementValidation'
import {
  useWizardFocus,
} from '../hooks/useWizardFocus'
import {
  canContinueDailyStep,
  DAILY_CHECKIN_STEP_IDS as STEP,
  getDailyCheckInSteps,
  getFirstInvalidDailyStep,
} from '../utils/dailyCheckInFlow'
import {
  DAILY_VALIDATED_MEASUREMENT_FIELDS,
} from '../utils/measurementValidation'
import {
  formatDate,
} from '../utils/formatters'
import '../styles/wizard.css'

const DAILY_MEASUREMENT_INPUT_IDS = {
  morning_weight: 'daily-morning-weight',
}

// Displays the guided, one-question-at-a-time check-in.
export function DailyCheckInPage({
  plan,
  target,
  cardioCompleted,
  settings,
  checkinDate = null,
  completionReturnLabel = 'Back to Dashboard',
  onSaved,
  onBack,
}) {
  const {
    today,
    checkInDate: activeCheckInDate,
    firstCheckInDate,
    form,
    existingCheckIn,
    hasDraft,
    resumeStep,
    saveMessage,
    isDirty,
    loading,
    saving,
    error,
    successMessage,
    canEdit,
    planHasStarted,
    setField,
    saveDraft,
    saveCheckIn,
  } = useDailyCheckIn(
    plan,
    onSaved,
    settings,
    checkinDate,
  )

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

  const {
    validationByField,
    warningConfirmation,
    requestWarningConfirmation,
    confirmWarningValues,
    cancelWarningConfirmation,
  } = useCheckInMeasurementValidation({
    form,
    fields:
      DAILY_VALIDATED_MEASUREMENT_FIELDS,
    unitSystem: 'imperial',
    inputIds:
      DAILY_MEASUREMENT_INPUT_IDS,
  })

  const steps = useMemo(
    () =>
      getDailyCheckInSteps(
        form,
        settings,
      ),
    [
      form,
      settings?.track_water,
      settings?.track_alcohol,
    ],
  )

  const currentStepIndex =
    steps.indexOf(currentStep)

  const safeStepIndex =
    currentStepIndex >= 0
      ? currentStepIndex
      : 0

  const activeStep =
    steps[safeStepIndex] ?? STEP.WEIGHT

  useEffect(() => {
    if (activeStep !== STEP.CARDIO) {
      return undefined
    }

    const input =
      document.getElementById(
        'daily-cardio-minutes',
      )

    if (!input) {
      return undefined
    }

    function selectDefaultZero() {
      if (input.value === '0') {
        input.select?.()
      }
    }

    input.addEventListener(
      'focus',
      selectDefaultZero,
    )

    return () => {
      input.removeEventListener(
        'focus',
        selectDefaultZero,
      )
    }
  }, [activeStep])

  const {
    markForwardNavigation,
    markBackNavigation,
    focusField,
  } = useWizardFocus({
    stepKey: `${activeStep}:${
      form.weight_status ?? ''
    }`,
    rootId:
      'daily-checkin-wizard-step',
    reviewing,
    disabled: Boolean(
      completionType ||
      warningConfirmation,
    ),
  })

  const previewAvailable =
    import.meta.env.DEV &&
    !planHasStarted

  const wizardAvailable =
    canEdit || previewing

  const isEditing =
    Boolean(existingCheckIn) &&
    !previewing

  const autosaveEnabled =
    !previewing &&
    canEdit &&
    !isEditing &&
    !checkinDate

  const shouldPersistDraft =
    autosaveEnabled &&
    (isDirty || hasDraft)

  const pageTitle = isEditing
    ? 'Update Daily Check-In'
    : hasDraft
      ? 'Continue Daily Check-In'
      : 'Daily Check-In'

  const reviewTitle = isEditing
    ? 'Review Your Changes'
    : 'Review Your Answers'

  useEffect(() => {
    if (
      loading ||
      isEditing ||
      !resumeStep
    ) {
      return
    }

    if (resumeStep === 'review') {
      setReviewing(true)
      return
    }

    if (steps.includes(resumeStep)) {
      setReviewing(false)
      setCurrentStep(resumeStep)
    }
  }, [
    isEditing,
    loading,
    resumeStep,
    steps,
  ])

  async function advanceFromCurrentStep() {
    const nextStep =
      steps[safeStepIndex + 1]
    const resumeAt =
      nextStep ?? 'review'

    markForwardNavigation()

    if (shouldPersistDraft) {
      const saved =
        await saveDraft(resumeAt)

      if (!saved) {
        return
      }
    }

    if (!nextStep) {
      setReviewing(true)
      return
    }

    setCurrentStep(nextStep)
  }

  async function goNext() {
    if (
      !canContinueDailyStep(
        activeStep,
        form,
        {
          validationByField,
          trackingSettings: settings,
        },
      )
    ) {
      return
    }

    if (
      activeStep === STEP.WEIGHT &&
      form.weight_status === 'recorded' &&
      requestWarningConfirmation([
        'morning_weight',
      ])
    ) {
      return
    }

    await advanceFromCurrentStep()
  }

  function editWarningValue() {
    const warning =
      warningConfirmation
        ?.warnings?.[0]

    cancelWarningConfirmation()

    if (warning?.inputId) {
      focusField(
        warning.inputId,
        {
          selectAll: true,
          preventScroll: false,
        },
      )
    }
  }

  async function confirmWarnings() {
    confirmWarningValues()
    await advanceFromCurrentStep()
  }

  async function goBack() {
    markBackNavigation()

    if (reviewing) {
      const previousStep =
        steps.at(-1) ?? STEP.WEIGHT

      if (shouldPersistDraft) {
        const saved =
          await saveDraft(previousStep)

        if (!saved) {
          return
        }
      }

      setReviewing(false)
      setCurrentStep(previousStep)
      return
    }

    const previousStep =
      steps[safeStepIndex - 1]

    if (!previousStep) {
      return
    }

    if (shouldPersistDraft) {
      const saved =
        await saveDraft(previousStep)

      if (!saved) {
        return
      }
    }

    setCurrentStep(previousStep)
  }

  async function handleExit() {
    if (saving) {
      return
    }

    if (shouldPersistDraft) {
      const resumeAt =
        reviewing
          ? 'review'
          : activeStep

      const saved =
        await saveDraft(resumeAt)

      if (!saved) {
        return
      }
    }

    onBack?.()
  }

  // Saves immediately when editing, unless a newly
  // required answer is missing.
  async function handleSave() {
    if (previewing) return

    const firstInvalidStep =
      getFirstInvalidDailyStep(
        form,
        {
          validationByField,
          trackingSettings: settings,
        },
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

  const warningDialog =
    warningConfirmation ? (
      <div className="confirmation-overlay">
        <section
          className="confirmation-dialog measurement-warning-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="daily-measurement-warning-title"
        >
          <h2 id="daily-measurement-warning-title">
            Please Double-Check
          </h2>

          {warningConfirmation.warnings.map(
            (warning) => (
              <p key={warning.key}>
                {warning.validation.message}
              </p>
            ),
          )}

          <div className="wizard-actions">
            <button
              type="button"
              onClick={editWarningValue}
            >
              Edit Value
            </button>

            <button
              type="button"
              onClick={confirmWarnings}
            >
              Use This Value
            </button>
          </div>
        </section>
      </div>
    ) : null

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
            {completionReturnLabel}
          </button>
        </section>
      </div>
    ) : null

  if (loading) {
    return (
      <WizardPage
        className="daily-checkin-page"
        title="Daily Check-In"
        onBack={
          autosaveEnabled
            ? handleExit
            : onBack
        }
        backLabel={
          autosaveEnabled
            ? 'Exit Check-In'
            : completionReturnLabel
        }
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
        backLabel={completionReturnLabel}
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
        backLabel={completionReturnLabel}
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
          onBack={
            autosaveEnabled
              ? handleExit
              : onBack
          }
          backLabel={
            autosaveEnabled
              ? 'Exit Check-In'
              : completionReturnLabel
          }
          status={
            <>
              {autosaveEnabled && (
                <p className="wizard-question-helper" role="status">
                  Autosave is on
                  {saveMessage
                    ? ` · ${saveMessage}`
                    : ''}
                </p>
              )}
              {feedback}
            </>
          }
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
            today={activeCheckInDate}
            settings={settings}
          />
        </WizardPage>

        {confirmationDialog}
        {warningDialog}
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

      {autosaveEnabled && (
        <p className="wizard-question-helper" role="status">
          Autosave is on
          {saveMessage
            ? ` · ${saveMessage}`
            : ''}
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
        subtitle={formatDate(activeCheckInDate)}
        status={pageStatus}
        progress={progress}
        progressLabel="Check-in progress"
        stepLabel={`Question ${
          safeStepIndex + 1
        } of ${steps.length}`}
        onBack={
          autosaveEnabled
            ? handleExit
            : onBack
        }
        backLabel={
          autosaveEnabled
            ? 'Exit Check-In'
            : completionReturnLabel
        }
        actions={
          <WizardActions
            backDisabled={
              safeStepIndex === 0
            }
            nextDisabled={
              !canContinueDailyStep(
                activeStep,
                form,
                {
                  validationByField,
                  trackingSettings: settings,
                },
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
            validationByField={
              validationByField
            }
          />
        </div>
      </WizardPage>

      {confirmationDialog}
      {warningDialog}
    </>
  )
}
