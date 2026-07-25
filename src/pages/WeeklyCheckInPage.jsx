import {
  useMemo,
  useState,
} from 'react'
import {
  WeeklyCheckInStep,
} from '../components/checkin/WeeklyCheckInStep'
import {
  WeeklyCheckInReview,
} from '../components/checkin/WeeklyCheckInReview'
import {
  useWeeklyCheckInPreview,
} from '../hooks/useWeeklyCheckInPreview'
import {
  DAILY_CHECKIN_STEP_IDS,
} from '../utils/dailyCheckInFlow'
import {
  canContinueWeeklyStep,
  fromWeeklyDailyStep,
  getWeeklyCheckInSteps,
  WEEKLY_CHECKIN_STEP_IDS as STEP,
} from '../utils/weeklyCheckInFlow'
import {
  getMeasurementValidation,
  getWarningConfirmationKey,
} from '../utils/measurementValidation'
import {
  normalizeUnitSystem,
} from '../utils/measurementUnits'
import {
  formatDate,
} from '../utils/formatters'
import '../styles/wizard.css'
import '../styles/weeklyCheckIn.css'

const VALIDATION_CONFIG = {
  morning_weight: {
    validationField:
      'starting_weight_lbs',
    label: 'Morning weight',
    inputId: 'daily-morning-weight',
  },
  scale_body_fat_percent: {
    validationField:
      'body_fat_percent',
    label: 'Body fat',
    inputId: 'weekly-scale-body-fat',
  },
  neck_inches: {
    validationField: 'neck_inches',
    label: 'Neck',
    inputId: 'weekly-neck',
  },
  waist_inches: {
    validationField: 'waist_inches',
    label: 'Waist',
    inputId: 'weekly-waist',
  },
  hips_inches: {
    validationField: 'hips_inches',
    label: 'Hips',
    inputId: 'weekly-hips',
  },
  bicep_inches: {
    validationField:
      'upper_arm_inches',
    label: 'Bicep',
    inputId: 'weekly-bicep',
  },
  thigh_inches: {
    validationField: 'thigh_inches',
    label: 'Thigh',
    inputId: 'weekly-thigh',
  },
  calf_inches: {
    validationField: 'calf_inches',
    label: 'Calf',
    inputId: 'weekly-calf',
  },
}

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
  const [
    confirmedWarningKeys,
    setConfirmedWarningKeys,
  ] = useState(() => new Set())
  const [
    warningConfirmation,
    setWarningConfirmation,
  ] = useState(null)

  const unitSystem =
    normalizeUnitSystem(
      profile?.unit_system,
    )

  const rawValidationByField =
    useMemo(
      () =>
        Object.fromEntries(
          Object.entries(
            VALIDATION_CONFIG,
          ).map(
            ([
              formField,
              config,
            ]) => [
              formField,
              getMeasurementValidation({
                field:
                  config.validationField,
                value: form[formField],
                unitSystem,
                label: config.label,
              }),
            ],
          ),
        ),
      [form, unitSystem],
    )

  const validationByField =
    useMemo(
      () =>
        Object.fromEntries(
          Object.entries(
            rawValidationByField,
          ).map(
            ([
              formField,
              validation,
            ]) => {
              const config =
                VALIDATION_CONFIG[
                  formField
                ]
              const key =
                getWarningConfirmationKey({
                  field:
                    config.validationField,
                  value: form[formField],
                  unitSystem,
                })

              const displayed =
                validation.status ===
                  'warning' &&
                confirmedWarningKeys.has(key)
                  ? {
                      status: 'valid',
                      message: '',
                    }
                  : validation

              const showMessage =
                ['invalid', 'warning']
                  .includes(
                    displayed.status,
                  )

              return [
                formField,
                {
                  ...displayed,
                  message: showMessage
                    ? displayed.message
                    : '',
                  displayState:
                    displayed.status ===
                    'invalid'
                      ? 'is-invalid'
                      : displayed.status ===
                          'warning'
                        ? 'is-warning'
                        : undefined,
                },
              ]
            },
          ),
        ),
      [
        confirmedWarningKeys,
        form,
        rawValidationByField,
        unitSystem,
      ],
    )

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
        validationByField,
      },
    )

  function getWarningFields(step) {
    const dailyStep =
      fromWeeklyDailyStep(step)

    if (
      dailyStep ===
        DAILY_CHECKIN_STEP_IDS.WEIGHT &&
      form.weight_status === 'recorded'
    ) {
      return ['morning_weight']
    }

    if (
      step === STEP.BODY_FAT &&
      form.body_fat_status === 'recorded'
    ) {
      return [
        'scale_body_fat_percent',
      ]
    }

    if (step === STEP.MEASUREMENTS) {
      return [
        'neck_inches',
        'waist_inches',
        'hips_inches',
        'bicep_inches',
        'thigh_inches',
        'calf_inches',
      ]
    }

    return []
  }

  function getActiveWarnings(step) {
    return getWarningFields(step)
      .map((formField) => {
        const config =
          VALIDATION_CONFIG[formField]
        const validation =
          rawValidationByField[formField]
        const key =
          getWarningConfirmationKey({
            field:
              config.validationField,
            value: form[formField],
            unitSystem,
          })

        return {
          inputId: config.inputId,
          key,
          validation,
        }
      })
      .filter(
        (item) =>
          item.validation?.status ===
            'warning' &&
          !confirmedWarningKeys.has(
            item.key,
          ),
      )
  }

  function advanceOneStep() {
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

  function advanceAfterBodyFatSkip() {
    advanceOneStep()
  }

  function handleNext() {
    if (!canContinue) {
      return
    }

    const warnings =
      getActiveWarnings(activeStep)

    if (warnings.length > 0) {
      setWarningConfirmation({
        warnings,
      })
      return
    }

    advanceOneStep()
  }

  function editWarningValue() {
    const warning =
      warningConfirmation
        ?.warnings?.[0]

    setWarningConfirmation(null)

    if (!warning?.inputId) {
      return
    }

    const input =
      document.getElementById(
        warning.inputId,
      )

    input?.focus()
    input?.select?.()
  }

  function confirmWarnings() {
    const keys =
      warningConfirmation
        ?.warnings?.map(
          (warning) => warning.key,
        ) ?? []

    setConfirmedWarningKeys(
      (current) =>
        new Set([
          ...current,
          ...keys,
        ]),
    )
    setWarningConfirmation(null)
    advanceOneStep()
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
    setWarningConfirmation(null)
    setConfirmedWarningKeys(
      new Set(),
    )
    setStepIndex(0)
  }

  const warningDialog =
    warningConfirmation ? (
      <div className="confirmation-overlay">
        <section
          className="confirmation-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="weekly-warning-title"
        >
          <h2 id="weekly-warning-title">
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
      <>
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

        {warningDialog}
      </>
    )
  }

  const progress =
    steps.length > 0
      ? ((safeStepIndex + 1) /
          steps.length) *
        100
      : 0

  return (
    <>
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
          onSkipBodyFat={
            advanceAfterBodyFatSkip
          }
          validationByField={
            validationByField
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

      {warningDialog}
    </>
  )
}
