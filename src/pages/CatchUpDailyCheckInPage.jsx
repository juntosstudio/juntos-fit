import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  WizardActions,
  WizardChoiceGroup,
  WizardPage,
  WizardQuestion,
} from '../components/wizard'
import {
  DailyCheckInStep,
} from '../components/checkin/DailyCheckInStep'
import {
  DailyCheckInReview,
} from '../components/checkin/DailyCheckInReview'
import {
  useCatchUpDailyCheckIn,
} from '../hooks/useCatchUpDailyCheckIn'
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
  MEAL_PLAN_DEVIATION_TYPES as DEVIATION,
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

const CATCH_UP_CHEAT_OPTIONS = [
  {
    value: DEVIATION.CHEAT_ONLY,
    label: 'Yes — that was my only deviation',
  },
  {
    value: DEVIATION.CHEAT_PLUS,
    label: 'Yes — and I had other deviations',
  },
  {
    value: DEVIATION.NO_CHEAT,
    label: 'No — my deviations were unrelated',
  },
]

function CatchUpDailyCheckInStep(props) {
  const { step, form, setField } = props

  if (step !== STEP.CHEAT_MEAL) {
    return <DailyCheckInStep {...props} />
  }

  function chooseDeviationType(value) {
    setField(
      'meal_plan_deviation_type',
      value,
    )

    setField(
      'planned_cheat_meal_status',
      [
        DEVIATION.CHEAT_ONLY,
        DEVIATION.CHEAT_PLUS,
      ].includes(value)
        ? 'eaten'
        : 'not_eaten',
    )

    if (value === DEVIATION.CHEAT_ONLY) {
      setField(
        'meal_plan_deviation_details',
        '',
      )
    }
  }

  return (
    <WizardQuestion title="Was one of yesterday’s meals your planned cheat meal?">
      <WizardChoiceGroup
        name="catchup-cheat-meal"
        value={
          form.meal_plan_deviation_type
        }
        options={CATCH_UP_CHEAT_OPTIONS}
        onChange={chooseDeviationType}
      />
    </WizardQuestion>
  )
}

export function CatchUpDailyCheckInPage({
  plan,
  target,
  cardioCompleted,
  settings,
  checkinDate,
  fromWeeklyPreflight = false,
  onSaved,
  onBack,
}) {
  const {
    form,
    setField,
    eligibility,
    loading,
    saving,
    error,
    saveCheckIn,
  } = useCatchUpDailyCheckIn({
    plan,
    checkinDate,
    trackingSettings: settings,
    onSaved,
  })

  const [currentStep, setCurrentStep] =
    useState(STEP.WEIGHT)
  const [reviewing, setReviewing] =
    useState(false)
  const [completed, setCompleted] =
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

    const input = document.getElementById(
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
      'catchup-daily-wizard-step',
    reviewing,
    disabled: Boolean(
      completed ||
      warningConfirmation,
    ),
  })

  function advanceFromCurrentStep() {
    const nextStep =
      steps[safeStepIndex + 1]

    markForwardNavigation()

    if (!nextStep) {
      setReviewing(true)
      return
    }

    setCurrentStep(nextStep)
  }

  function goNext() {
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

    advanceFromCurrentStep()
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

  function editWarningValue() {
    const warning =
      warningConfirmation
        ?.warnings?.[0]

    cancelWarningConfirmation()

    if (warning?.inputId) {
      focusField(warning.inputId, {
        selectAll: true,
        preventScroll: false,
      })
    }
  }

  function confirmWarnings() {
    confirmWarningValues()
    advanceFromCurrentStep()
  }

  async function handleSubmit() {
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
      setCurrentStep(firstInvalidStep)
      return
    }

    const saved = await saveCheckIn()

    if (saved) {
      setCompleted(true)
    }
  }

  const warningDialog =
    warningConfirmation ? (
      <div className="confirmation-overlay">
        <section
          className="confirmation-dialog measurement-warning-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="catchup-measurement-warning-title"
        >
          <h2 id="catchup-measurement-warning-title">
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

  if (loading) {
    return (
      <WizardPage
        className="daily-checkin-page"
        title="Missed Daily Check-In"
        onBack={onBack}
      >
        <p>Loading this check-in...</p>
      </WizardPage>
    )
  }

  if (!eligibility?.allowed) {
    return (
      <WizardPage
        className="daily-checkin-page"
        title="Missed Daily Check-In"
        subtitle={
          checkinDate
            ? formatDate(checkinDate)
            : undefined
        }
        onBack={onBack}
      >
        <p role="alert">
          {error ||
            eligibility?.reason ||
            'This check-in is not available.'}
        </p>
      </WizardPage>
    )
  }

  if (completed) {
    return (
      <div className="confirmation-overlay">
        <section
          className="confirmation-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="catchup-saved-title"
        >
          <div
            className="confirmation-checkmark"
            aria-hidden="true"
          >
            ✓
          </div>

          <h2 id="catchup-saved-title">
            Daily Check-In Saved
          </h2>

          <p>
            {formatDate(checkinDate)} is now
            complete.
          </p>

          {fromWeeklyPreflight && (
            <p className="catchup-return-note">
              Next, you’ll return to your Weekly
              Check-In.
            </p>
          )}

          <button
            type="button"
            onClick={onBack}
          >
            {fromWeeklyPreflight
              ? 'Return to Weekly Check-In'
              : 'Continue'}
          </button>
        </section>
      </div>
    )
  }

  const feedback = error ? (
    <p role="alert">{error}</p>
  ) : fromWeeklyPreflight ? (
    <aside
      className="catchup-daily-context"
      aria-label="Missing Daily Check-In context"
    >
      <strong>
        You’re completing a missing Daily
        Check-In first.
      </strong>
      <span>
        Save this Daily, then Juntos will bring
        you back to your overdue Weekly
        Check-In.
      </span>
    </aside>
  ) : (
    <p className="catchup-context-note">
      You’re filling the answers that belonged
      to this original check-in date. It will stay
      recorded on that date, not today.
    </p>
  )

  if (reviewing) {
    return (
      <>
        <WizardPage
          className="daily-checkin-page"
          title="Review Missing Daily Check-In"
          subtitle={formatDate(checkinDate)}
          status={feedback}
          onBack={onBack}
          actions={
            <WizardActions
              backLabel="Edit Answers"
              nextLabel={
                saving
                  ? 'Saving...'
                  : 'Submit Check-In'
              }
              busy={saving}
              onBack={goBack}
              onNext={handleSubmit}
            />
          }
        >
          <DailyCheckInReview
            form={form}
            target={target}
            today={checkinDate}
            settings={settings}
          />
        </WizardPage>

        {warningDialog}
      </>
    )
  }

  const progress =
    ((safeStepIndex + 1) /
      steps.length) *
    100

  return (
    <>
      <WizardPage
        className="daily-checkin-page"
        title="Complete Missing Daily Check-In"
        subtitle={formatDate(checkinDate)}
        status={feedback}
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
              safeStepIndex ===
              steps.length - 1
                ? 'Review Answers'
                : 'Next'
            }
            onBack={goBack}
            onNext={goNext}
          />
        }
      >
        <div id="catchup-daily-wizard-step">
          <CatchUpDailyCheckInStep
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

      {warningDialog}
    </>
  )
}
