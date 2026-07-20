import {
  useMemo,
  useState,
} from 'react'
import { StartCheckInStep } from '../components/startcheckin/StartCheckInStep'
import { StartCheckInReview } from '../components/startcheckin/StartCheckInReview'
import { useStartCheckIn } from '../hooks/useStartCheckIn'
import { useWizardFocus } from '../hooks/useWizardFocus'
import {
  getStartCheckInSteps,
  START_CHECKIN_STEP_IDS as STEP,
} from '../utils/startCheckInFlow'
import {
  getMeasurementValidation,
  getWarningConfirmationKey,
} from '../utils/measurementValidation'
import { formatDate } from '../utils/formatters'
import '../styles/startCheckIn.css'

function getStepFields(step, form) {
  const fieldMap = {
    [STEP.WEIGHT]: [
      ['starting_weight_lbs', 'Starting weight'],
    ],
    [STEP.NECK]: [
      ['neck_inches', 'Neck'],
    ],
    [STEP.CHEST]: [
      ['chest_inches', 'Chest'],
    ],
    [STEP.WAIST]: [
      ['waist_inches', 'Waist'],
    ],
    [STEP.HIPS]: [
      ['hips_inches', 'Hips'],
    ],
    [STEP.SIDE_MEASUREMENTS]: [
      [
        'upper_arm_inches',
        `${form.measurement_side} upper arm`,
      ],
      [
        'thigh_inches',
        `${form.measurement_side} thigh`,
      ],
      [
        'calf_inches',
        `${form.measurement_side} calf`,
      ],
    ],
  }

  return fieldMap[step] ?? []
}

function hasStartedProgress(form, photos) {
  return (
    Object.entries(form).some(
      ([key, value]) =>
        key === 'body_fat_unavailable'
          ? value === true
          : value !== '',
    ) ||
    Object.values(photos).some(Boolean)
  )
}

// Displays the guided Start Check-In wizard.
export function StartCheckInPage({
  plan,
  onSaved,
  onBack,
}) {
  const {
    unitSystem,
    form,
    photos,
    estimatedBodyFat,
    isDirty,
    loading,
    saving,
    uploadingPose,
    error,
    successMessage,
    canEdit,
    isReadOnly,
    planHasStarted,
    isCompleted,
    setField,
    clearMessages,
    saveCheckIn,
    uploadPhoto,
  } = useStartCheckIn(plan, onSaved)

  const steps = useMemo(
    () => getStartCheckInSteps(plan),
    [plan],
  )

  const [currentStep, setCurrentStep] =
    useState(STEP.TIPS)
  const [reviewing, setReviewing] =
    useState(false)
  const [completionType, setCompletionType] =
    useState(null)
  const [previewing, setPreviewing] =
    useState(false)
  const [touchedFields, setTouchedFields] =
    useState({})
  const [
    confirmedWarningKeys,
    setConfirmedWarningKeys,
  ] = useState(() => new Set())
  const [
    warningConfirmation,
    setWarningConfirmation,
  ] = useState(null)

  const currentIndex =
    steps.indexOf(currentStep)
  const safeIndex =
    currentIndex >= 0 ? currentIndex : 0
  const activeStep =
    steps[safeIndex] ?? STEP.TIPS

  const {
    markForwardNavigation,
    markBackNavigation,
    focusField,
  } = useWizardFocus({
    stepKey: activeStep,
    rootId: 'start-checkin-wizard-step',
    reviewing,
    disabled: Boolean(
      completionType ||
      warningConfirmation,
    ),
  })

  const validationByField = useMemo(() => {
    const side =
      form.measurement_side || 'chosen'

    const labels = {
      starting_weight_lbs: 'Starting weight',
      body_fat_percent: 'Body fat',
      neck_inches: 'Neck',
      chest_inches: 'Chest',
      waist_inches: 'Waist',
      hips_inches: 'Hips',
      upper_arm_inches: `${side} upper arm`,
      thigh_inches: `${side} thigh`,
      calf_inches: `${side} calf`,
    }

    return Object.fromEntries(
      Object.entries(labels).map(
        ([field, label]) => [
          field,
          getMeasurementValidation({
            field,
            value: form[field],
            unitSystem,
            label,
          }),
        ],
      ),
    )
  }, [form, unitSystem])

  const displayedValidationByField =
    useMemo(
      () =>
        Object.fromEntries(
          Object.entries(
            validationByField,
          ).map(([field, validation]) => {
            if (
              validation.status !== 'warning'
            ) {
              return [field, validation]
            }

            const confirmationKey =
              getWarningConfirmationKey({
                field,
                value: form[field],
                unitSystem,
              })

            return confirmedWarningKeys.has(
              confirmationKey,
            )
              ? [
                  field,
                  {
                    status: 'valid',
                    message: '',
                  },
                ]
              : [field, validation]
          }),
        ),
      [
        confirmedWarningKeys,
        form,
        unitSystem,
        validationByField,
      ],
    )

  const previewAvailable =
    import.meta.env.DEV && !planHasStarted
  const wizardAvailable =
    canEdit ||
    previewing ||
    isCompleted
  const startedProgress =
    hasStartedProgress(form, photos)

  const pageTitle = isCompleted
    ? isReadOnly
      ? 'View Start Check-In'
      : 'Update Start Check-In'
    : startedProgress
      ? 'Continue Start Check-In'
      : 'Start Check-In'

  function markFieldTouched(field) {
    setTouchedFields((current) => ({
      ...current,
      [field]: true,
    }))
  }

  function touchStepFields(step) {
    const fields = getStepFields(step, form)

    setTouchedFields((current) => ({
      ...current,
      ...Object.fromEntries(
        fields.map(([field]) => [
          field,
          true,
        ]),
      ),
      ...(step === STEP.BODY_FAT
        ? { body_fat_percent: true }
        : {}),
    }))
  }

  function getActiveWarnings(step) {
    const fields = getStepFields(step, form)

    if (
      step === STEP.BODY_FAT &&
      plan.body_fat_source === 'scale' &&
      !form.body_fat_unavailable
    ) {
      fields.push([
        'body_fat_percent',
        'Body fat',
      ])
    }

    return fields
      .map(([field, label]) => ({
        field,
        label,
        value: form[field],
        validation:
          validationByField[field],
        key: getWarningConfirmationKey({
          field,
          value: form[field],
          unitSystem,
        }),
      }))
      .filter(
        (item) =>
          item.validation?.status ===
            'warning' &&
          !confirmedWarningKeys.has(item.key),
      )
  }

  function stepCanContinue(step) {
    if (
      isReadOnly ||
      step === STEP.TIPS
    ) {
      return true
    }

    if (step === STEP.BODY_FAT) {
      if (
        plan.body_fat_source ===
        'juntos_estimate'
      ) {
        return Boolean(estimatedBodyFat)
      }

      if (form.body_fat_unavailable) {
        return true
      }

      return ![
        'unanswered',
        'invalid',
      ].includes(
        validationByField.body_fat_percent
          ?.status,
      )
    }

    const stepFields =
      getStepFields(step, form)

    if (stepFields.length > 0) {
      return stepFields.every(
        ([field]) =>
          !['unanswered', 'invalid'].includes(
            validationByField[field]?.status,
          ),
      )
    }

    if (step === STEP.SIDE) {
      return Boolean(form.measurement_side)
    }

    if (step === STEP.FRONT_PHOTO) {
      return previewing || Boolean(photos.front)
    }

    if (step === STEP.SIDE_PHOTO) {
      return (
        previewing ||
        photos.side?.side_view ===
          form.measurement_side
      )
    }

    if (step === STEP.BACK_PHOTO) {
      return previewing || Boolean(photos.back)
    }

    return true
  }

  function advanceFromCurrentStep() {
    const nextStep = steps[safeIndex + 1]

    clearMessages()

    markForwardNavigation()

    if (!nextStep) {
      setReviewing(true)
      return
    }

    setCurrentStep(nextStep)
  }

  function goNext() {
    touchStepFields(activeStep)

    if (!stepCanContinue(activeStep)) {
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

    advanceFromCurrentStep()
  }

  function editWarningValue() {
    const field =
      warningConfirmation?.warnings?.[0]?.field

    setWarningConfirmation(null)

    if (field) {
      focusField(
        `start-measurement-${field}`,
        {
          selectAll: true,
          preventScroll: false,
        },
      )
    }
  }

  function confirmWarnings() {
    const keys =
      warningConfirmation?.warnings.map(
        (warning) => warning.key,
      ) ?? []

    setConfirmedWarningKeys(
      (currentKeys) =>
        new Set([...currentKeys, ...keys]),
    )
    setWarningConfirmation(null)
    advanceFromCurrentStep()
  }

  function goBack() {
    clearMessages()
    markBackNavigation()

    if (reviewing) {
      setReviewing(false)
      setCurrentStep(
        steps.at(-1) ?? STEP.TIPS,
      )
      return
    }

    const previous = steps[safeIndex - 1]

    if (previous) {
      setCurrentStep(previous)
    }
  }

  async function handleSaveProgress() {
    if (!previewing && canEdit) {
      await saveCheckIn({ complete: false })
    }
  }

  async function handleComplete() {
    if (previewing || !canEdit) {
      return
    }

    const invalidStep = steps.find(
      (step) => !stepCanContinue(step),
    )

    if (invalidStep) {
      markForwardNavigation()
      setReviewing(false)
      setCurrentStep(invalidStep)
      touchStepFields(invalidStep)
      return
    }

    const wasCompleted = isCompleted
    const saved = await saveCheckIn({
      complete: true,
    })

    if (saved) {
      setCompletionType(
        wasCompleted ? 'updated' : 'completed',
      )
    }
  }

  function startPreview() {
    markForwardNavigation()
    setPreviewing(true)
    setCurrentStep(STEP.TIPS)
    setReviewing(false)
    setCompletionType(null)
  }

  const confirmation = completionType ? (
    <div className="confirmation-overlay">
      <section
        className="confirmation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="start-confirmation-title"
      >
        <div
          className="confirmation-checkmark"
          aria-hidden="true"
        >
          ✓
        </div>

        <h2 id="start-confirmation-title">
          {completionType === 'updated'
            ? 'Start Check-In Updated'
            : 'Start Check-In Complete'}
        </h2>

        <p>
          {completionType === 'updated'
            ? 'Your starting baseline changes have been saved.'
            : 'Your starting baseline is saved. Your plan is officially underway.'}
        </p>

        <button type="button" onClick={onBack}>
          Back to Dashboard
        </button>
      </section>
    </div>
  ) : null

  const warningDialog =
    warningConfirmation ? (
      <div className="confirmation-overlay">
        <section
          className="confirmation-dialog measurement-warning-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="measurement-warning-title"
        >
          <h2 id="measurement-warning-title">
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
      <main className="container start-checkin-page">
        <button type="button" onClick={onBack}>
          Back to Dashboard
        </button>

        <h1>Start Check-In</h1>
        <p>Loading your starting baseline...</p>
      </main>
    )
  }

  if (!plan) {
    return (
      <main className="container start-checkin-page">
        <button type="button" onClick={onBack}>
          Back to Dashboard
        </button>

        <h1>Start Check-In</h1>
        <p role="alert">
          No active coaching plan was found.
        </p>
      </main>
    )
  }

  if (!wizardAvailable) {
    return (
      <main className="container start-checkin-page">
        <button type="button" onClick={onBack}>
          Back to Dashboard
        </button>

        <h1>Start Check-In</h1>

        <p>
          Your Start Check-In will be available on your
          plan start date.
        </p>

        <p>
          Your plan starts{' '}
          <strong>
            {formatDate(plan.start_date)}
          </strong>
          .
        </p>

        {previewAvailable && (
          <button type="button" onClick={startPreview}>
            Preview Start Check-In Wizard
          </button>
        )}
      </main>
    )
  }

  if (reviewing) {
    return (
      <>
        <main className="container start-checkin-page">
          <button type="button" onClick={onBack}>
            Back to Dashboard
          </button>

          <h1>
            {isReadOnly
              ? 'Starting Baseline'
              : isCompleted
                ? 'Review Your Changes'
                : 'Review Your Starting Baseline'}
          </h1>

          {isReadOnly && (
            <p className="start-lock-notice">
              This baseline is locked because the plan
              start date has passed.
            </p>
          )}

          <StartCheckInReview
            plan={plan}
            form={form}
            photos={photos}
            estimatedBodyFat={
              estimatedBodyFat
            }
            unitSystem={unitSystem}
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
              {isReadOnly
                ? 'View Answers'
                : 'Edit Answers'}
            </button>

            {!isReadOnly && (
              <button
                type="button"
                disabled={
                  saving ||
                  previewing ||
                  (isCompleted && !isDirty)
                }
                onClick={handleComplete}
              >
                {saving
                  ? 'Saving...'
                  : isCompleted
                    ? 'Save Changes'
                    : 'Complete Start Check-In'}
              </button>
            )}
          </div>

          {previewing && (
            <p role="status">
              Preview mode — photos and submission are
              disabled.
            </p>
          )}
        </main>

        {confirmation}
        {warningDialog}
      </>
    )
  }

  const progress =
    ((safeIndex + 1) / steps.length) * 100

  return (
    <>
      <main className="container start-checkin-page">
        <button type="button" onClick={onBack}>
          Back to Dashboard
        </button>

        <h1>{pageTitle}</h1>
        <p>{formatDate(plan.start_date)}</p>

        {isReadOnly && (
          <p className="start-lock-notice">
            This baseline is locked and view-only.
          </p>
        )}

        {previewing && (
          <p role="status">
            Preview mode — photos and submission are
            disabled.
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
          aria-label="Start Check-In progress"
        />

        <p>
          Question {safeIndex + 1} of {steps.length}
        </p>

        <div id="start-checkin-wizard-step">
          <StartCheckInStep
            step={activeStep}
          plan={plan}
          form={form}
          photos={photos}
          estimatedBodyFat={estimatedBodyFat}
          unitSystem={unitSystem}
          validationByField={displayedValidationByField}
          touchedFields={touchedFields}
          markFieldTouched={markFieldTouched}
          setField={setField}
          uploadPhoto={uploadPhoto}
          uploadingPose={uploadingPose}
          previewing={previewing}
          readOnly={isReadOnly}
            sideLocked={isCompleted}
          />
        </div>

        <div className="wizard-actions">
          <button
            type="button"
            disabled={safeIndex === 0}
            onClick={goBack}
          >
            Back
          </button>

          <button
            type="button"
            disabled={!stepCanContinue(activeStep)}
            onClick={goNext}
          >
            {safeIndex === steps.length - 1
              ? isReadOnly
                ? 'Review Baseline'
                : isCompleted
                  ? 'Review Changes'
                  : 'Review Baseline'
              : 'Next'}
          </button>
        </div>

        {!previewing &&
          canEdit &&
          isDirty && (
            <div className="start-save-progress">
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveProgress}
              >
                {saving
                  ? 'Saving...'
                  : isCompleted
                    ? 'Save Changes'
                    : 'Save Progress'}
              </button>
            </div>
          )}
      </main>

      {confirmation}
      {warningDialog}
    </>
  )
}
