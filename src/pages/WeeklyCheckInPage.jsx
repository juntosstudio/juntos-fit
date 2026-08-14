import {
  useEffect,
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
  useWeeklyCheckIn,
} from '../hooks/useWeeklyCheckIn'
import {
  DAILY_CHECKIN_STEP_IDS,
} from '../utils/dailyCheckInFlow'
import {
  canContinueWeeklyStep,
  fromWeeklyDailyStep,
  getWeeklyCheckInSteps,
  getWeeklyStepMeasurementFields,
  WEEKLY_CHECKIN_STEP_IDS as STEP,
} from '../utils/weeklyCheckInFlow'
import {
  getCheckInMeasurementValidation,
  getCheckInWarningConfirmationKey,
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
    label: 'Morning weight',
    inputId: 'daily-morning-weight',
  },
  scale_body_fat_percent: {
    label: 'Body fat',
    inputId: 'weekly-scale-body-fat',
  },
  cardio_minutes: {
    label: 'Cardio',
    inputId: 'daily-cardio-minutes',
  },
  neck_inches: {
    label: 'Neck',
    inputId: 'weekly-neck',
  },
  chest_inches: {
    label: 'Chest',
    inputId: 'weekly-chest',
  },
  waist_inches: {
    label: 'Waist',
    inputId: 'weekly-waist',
  },
  hips_inches: {
    label: 'Hips',
    inputId: 'weekly-hips',
  },
  bicep_inches: {
    label: 'Bicep',
    inputId: 'weekly-bicep',
  },
  thigh_inches: {
    label: 'Thigh',
    inputId: 'weekly-thigh',
  },
  calf_inches: {
    label: 'Calf',
    inputId: 'weekly-calf',
  },
}

export function WeeklyCheckInPage({
  plan,
  profile,
  target,
  cardioCompleted,
  settings,
  onSaved,
  onBack,
}) {
  const unitSystem =
    normalizeUnitSystem(
      profile?.unit_system,
    )

  const bodyFatSource =
    settings?.user_id
      ? settings.body_fat_source
      : plan?.body_fat_source ?? 'none'

  const {
    today,
    weekNumber,
    photosRequired,
    isFinalWeekly,
    persistenceEnabled,
    isCompleted,
    resumeStep,
    form,
    photos,
    estimatedBodyFat,
    reviewBodyFatSource,
    reviewEstimatedBodyFat,
    loading,
    saving,
    uploadingPose,
    error,
    saveMessage,
    setField,
    saveDraft,
    uploadPhoto,
    submitCheckIn,
    resetPreview,
  } = useWeeklyCheckIn(
    plan,
    {
      bodyFatSource,
      unitSystem,
      settings,
      onSaved,
    },
  )

  const [stepIndex, setStepIndex] =
    useState(0)
  const [reviewing, setReviewing] =
    useState(false)
  const [pageError, setPageError] =
    useState('')
  const [
    confirmedWarningKeys,
    setConfirmedWarningKeys,
  ] = useState(() => new Set())
  const [
    warningConfirmation,
    setWarningConfirmation,
  ] = useState(null)

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
              getCheckInMeasurementValidation({
                formField,
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
              const key =
                getCheckInWarningConfirmationKey({
                  formField,
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
        bodyFatSource,
        sex: profile?.sex,
        photosRequired,
        trackingSettings: settings,
      }),
    [
      form,
      bodyFatSource,
      profile?.sex,
      photosRequired,
      settings?.track_water,
      settings?.track_alcohol,
    ],
  )

  useEffect(() => {
    if (loading || steps.length === 0) {
      return
    }

    if (
      isCompleted ||
      resumeStep === 'review'
    ) {
      setReviewing(true)
      return
    }

    const resumedIndex =
      steps.indexOf(resumeStep)

    setReviewing(false)
    setStepIndex(
      resumedIndex >= 0
        ? resumedIndex
        : 0,
    )
  }, [
    loading,
    isCompleted,
    resumeStep,
    steps,
  ])

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
        bodyFatSource,
        photosRequired,
        photos,
        previewMode:
          !persistenceEnabled,
        validationByField,
      },
    )

  // Keep the known Weekly cardio behavior aligned
  // with Daily while we finish the browser polish.
  useEffect(() => {
    const dailyStep =
      fromWeeklyDailyStep(activeStep)

    if (
      dailyStep !==
      DAILY_CHECKIN_STEP_IDS.CARDIO
    ) {
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
      if (input.value !== '0') {
        return
      }

      requestAnimationFrame(() => {
        input.select?.()
      })
    }

    input.addEventListener(
      'focus',
      selectDefaultZero,
    )
    input.addEventListener(
      'click',
      selectDefaultZero,
    )
    input.addEventListener(
      'pointerup',
      selectDefaultZero,
    )

    return () => {
      input.removeEventListener(
        'focus',
        selectDefaultZero,
      )
      input.removeEventListener(
        'click',
        selectDefaultZero,
      )
      input.removeEventListener(
        'pointerup',
        selectDefaultZero,
      )
    }
  }, [activeStep])

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
      dailyStep ===
      DAILY_CHECKIN_STEP_IDS.CARDIO
    ) {
      return ['cardio_minutes']
    }

    if (
      step === STEP.BODY_FAT &&
      form.body_fat_status === 'recorded'
    ) {
      return [
        'scale_body_fat_percent',
      ]
    }

    return getWeeklyStepMeasurementFields(
      step,
    )
  }

  function getActiveWarnings(step) {
    return getWarningFields(step)
      .map((formField) => {
        const config =
          VALIDATION_CONFIG[formField]
        const validation =
          rawValidationByField[formField]
        const key =
          getCheckInWarningConfirmationKey({
            formField,
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

  function getNextStep() {
    if (
      safeStepIndex >=
      steps.length - 1
    ) {
      return 'review'
    }

    return steps[safeStepIndex + 1]
  }

  async function saveAndAdvance(
    formToSave = form,
  ) {
    const nextStep = getNextStep()
    const saved = await saveDraft(
      nextStep,
      formToSave,
    )

    if (!saved) {
      return
    }

    if (nextStep === 'review') {
      setReviewing(true)
      return
    }

    setStepIndex(
      safeStepIndex + 1,
    )
  }

  async function handleNext() {
    setPageError('')

    if (!canContinue || saving) {
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

    await saveAndAdvance()
  }

  async function handleBodyFatSkip() {
    if (saving) {
      return
    }

    const nextForm = {
      ...form,
      body_fat_status: 'no_reading',
      scale_body_fat_percent: '',
    }

    setField(
      'body_fat_status',
      'no_reading',
    )
    setField(
      'scale_body_fat_percent',
      '',
    )

    await saveAndAdvance(nextForm)
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

  async function confirmWarnings() {
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
    await saveAndAdvance()
  }

  async function handleBack() {
    setPageError('')

    if (saving) {
      return
    }

    if (reviewing) {
      const previousIndex =
        Math.max(
          steps.length - 1,
          0,
        )
      const previousStep =
        steps[previousIndex]

      const saved = await saveDraft(
        previousStep,
      )

      if (saved) {
        setReviewing(false)
        setStepIndex(previousIndex)
      }
      return
    }

    const previousIndex =
      Math.max(
        safeStepIndex - 1,
        0,
      )
    const previousStep =
      steps[previousIndex]

    const saved = await saveDraft(
      previousStep,
    )

    if (saved) {
      setStepIndex(previousIndex)
    }
  }

  async function handleSaveAndExit() {
    if (saving) {
      return
    }

    const resumeAt =
      reviewing
        ? 'review'
        : activeStep

    const saved = await saveDraft(
      resumeAt,
    )

    if (!saved) {
      return
    }

    await onSaved?.()
    onBack?.()
  }

  function validateSubmission() {
    for (
      let index = 0;
      index < steps.length;
      index += 1
    ) {
      const step = steps[index]
      const valid =
        canContinueWeeklyStep(
          step,
          form,
          {
            bodyFatSource,
            photosRequired,
            photos,
            previewMode: false,
            validationByField,
          },
        )

      if (!valid) {
        return {
          valid: false,
          index,
        }
      }
    }

    return {
      valid: true,
      index: -1,
    }
  }

  async function handleSubmit() {
    setPageError('')

    const validation =
      validateSubmission()

    if (!validation.valid) {
      setReviewing(false)
      setStepIndex(validation.index)
      setPageError(
        'One answer still needs attention before this Weekly Check-In can be submitted.',
      )
      return
    }

    const submitted =
      await submitCheckIn()

    if (submitted) {
      onBack?.()
    }
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
              disabled={saving}
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
          Create a plan before opening the
          Weekly Check-In.
        </p>
      </main>
    )
  }

  if (loading) {
    return (
      <main className="container weekly-checkin-page">
        <h1>Weekly Check-In</h1>
        <p>Loading your check-in...</p>
      </main>
    )
  }

  if (reviewing) {
    return (
      <>
        <main className="container weekly-checkin-page">
          <button
            type="button"
            disabled={saving}
            onClick={
              persistenceEnabled &&
              !isCompleted
                ? handleSaveAndExit
                : onBack
            }
          >
            {persistenceEnabled &&
            !isCompleted
              ? 'Save & Exit'
              : 'Back to Dashboard'}
          </button>

          {!persistenceEnabled && (
            <p className="weekly-preview-badge">
              DEV Preview · Nothing will be saved
            </p>
          )}

          {persistenceEnabled &&
          !isCompleted && (
            <p
              className="weekly-preview-badge"
              role="status"
            >
              Autosave is on
              {saveMessage
                ? ` · ${saveMessage}`
                : ''}
            </p>
          )}

          <h1>
            {isCompleted
              ? `Week ${weekNumber} Check-In`
              : 'Review Weekly Check-In'}
          </h1>

          {(error || pageError) && (
            <p role="alert">
              {error || pageError}
            </p>
          )}

          <WeeklyCheckInReview
            form={form}
            target={target}
            today={today}
            weekNumber={weekNumber}
            plan={plan}
            photos={photos}
            settings={settings}
            photosRequired={
              photosRequired
            }
            unitSystem={unitSystem}
            bodyFatSource={
              isCompleted
                ? reviewBodyFatSource
                : bodyFatSource
            }
            estimatedBodyFat={
              isCompleted
                ? reviewEstimatedBodyFat
                : estimatedBodyFat
            }
          />

          {!isCompleted &&
          persistenceEnabled && (
            <div className="wizard-actions">
              <button
                type="button"
                disabled={saving}
                onClick={handleBack}
              >
                Edit Answers
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={handleSubmit}
              >
                {saving
                  ? 'Saving...'
                  : 'Submit Weekly Check-In'}
              </button>
            </div>
          )}

          {!persistenceEnabled && (
            <>
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
                  title="Real submission is available only on the scheduled Weekly Check-In date."
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
            </>
          )}

          {isCompleted && (
            <button
              type="button"
              onClick={onBack}
            >
              Back to Dashboard
            </button>
          )}
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
          disabled={saving}
          onClick={
            persistenceEnabled
              ? handleSaveAndExit
              : onBack
          }
        >
          {persistenceEnabled
            ? 'Save & Exit'
            : 'Back to Dashboard'}
        </button>

        {!persistenceEnabled && (
          <p className="weekly-preview-badge">
            DEV Preview · Weekly #{weekNumber}
            {isFinalWeekly
              ? ' · Final Check-In'
              : photosRequired
                ? ' · Full Measurements + Photos'
                : ' · Waist Check-In'}
            {' · '}Nothing will be saved
          </p>
        )}

        {persistenceEnabled && (
          <p
            className="weekly-preview-badge"
            role="status"
          >
            Autosave is on
            {saveMessage
              ? ` · ${saveMessage}`
              : ''}
          </p>
        )}

        <h1>
          Week {weekNumber} Check-In
        </h1>

        <p>{formatDate(today)}</p>

        {(error || pageError) && (
          <p role="alert">
            {error || pageError}
          </p>
        )}

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
          uploadPhoto={uploadPhoto}
          uploadingPose={
            uploadingPose
          }
          persistenceEnabled={
            persistenceEnabled
          }
          onSkipBodyFat={
            handleBodyFatSkip
          }
          unitSystem={unitSystem}
          validationByField={
            validationByField
          }
        />

        <div className="wizard-actions">
          <button
            type="button"
            disabled={
              safeStepIndex === 0 ||
              saving
            }
            onClick={handleBack}
          >
            Back
          </button>

          <button
            type="button"
            disabled={
              !canContinue ||
              saving ||
              Boolean(uploadingPose)
            }
            onClick={handleNext}
          >
            {saving
              ? 'Saving...'
              : safeStepIndex ===
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
