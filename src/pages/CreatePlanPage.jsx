import { useState } from 'react'
import { CreatePlanStep } from '../components/plan/CreatePlanStep'
import { CreatePlanReview } from '../components/plan/CreatePlanReview'
import { useCreatePlan } from '../hooks/useCreatePlan'
import { useWizardFocus } from '../hooks/useWizardFocus'
import {
  CREATE_PLAN_STEPS,
  validateCreatePlanStep,
} from '../utils/createPlanFlow'
import '../styles/createPlan.css'

// Displays the guided Create Plan wizard.
export function CreatePlanPage({
  userId,
  previewOnly = false,
  onSaved,
  onBack,
}) {
  const {
    today,
    form,
    saving,
    error,
    createdPlanId,
    setField,
    savePlan,
  } = useCreatePlan(userId, onSaved)

  const [stepIndex, setStepIndex] = useState(0)
  const [reviewing, setReviewing] =
    useState(false)

  const activeStep =
    CREATE_PLAN_STEPS[stepIndex]

  const {
    markForwardNavigation,
    markBackNavigation,
  } = useWizardFocus({
    stepKey: activeStep,
    rootId: 'create-plan-wizard-step',
    reviewing,
    disabled: Boolean(createdPlanId),
  })
  const stepError = validateCreatePlanStep(
    activeStep,
    form,
    today,
  )

  function goNext() {
    if (stepError) {
      return
    }

    const nextIndex = stepIndex + 1

    markForwardNavigation()

    if (
      nextIndex >= CREATE_PLAN_STEPS.length
    ) {
      setReviewing(true)
      return
    }

    setStepIndex(nextIndex)
  }

  function goBack() {
    markBackNavigation()

    if (reviewing) {
      setReviewing(false)
      setStepIndex(
        CREATE_PLAN_STEPS.length - 1,
      )
      return
    }

    setStepIndex((currentIndex) =>
      Math.max(0, currentIndex - 1),
    )
  }

  async function handleCreatePlan() {
    if (previewOnly) {
      return
    }

    const result = await savePlan()

    if (
      !result.saved &&
      result.invalidStep
    ) {
      const invalidIndex =
        CREATE_PLAN_STEPS.indexOf(
          result.invalidStep,
        )

      if (invalidIndex >= 0) {
        markForwardNavigation()
        setReviewing(false)
        setStepIndex(invalidIndex)
      }
    }
  }

  const progress = reviewing
    ? 100
    : ((stepIndex + 1) /
        CREATE_PLAN_STEPS.length) *
      100

  return (
    <>
      <main className="container create-plan-page">
        <button type="button" onClick={onBack}>
          Back to Dashboard
        </button>

        <h1>
          {reviewing
            ? 'Review Your Plan'
            : 'Create Plan'}
        </h1>

        {previewOnly && (
          <p role="status">
            Preview mode — you already have an active
            plan, so this plan cannot be created.
          </p>
        )}

        <progress
          max="100"
          value={progress}
          aria-label="Create Plan progress"
        />

        <p>
          {reviewing
            ? 'Final review'
            : `Step ${stepIndex + 1} of ${
                CREATE_PLAN_STEPS.length
              }`}
        </p>

        {reviewing ? (
          <CreatePlanReview form={form} />
        ) : (
          <div id="create-plan-wizard-step">
            <CreatePlanStep
              step={activeStep}
              form={form}
              today={today}
              setField={setField}
            />
          </div>
        )}

        {error && <p role="alert">{error}</p>}

        <div className="wizard-actions">
          <button
            type="button"
            disabled={
              saving ||
              (!reviewing && stepIndex === 0)
            }
            onClick={goBack}
          >
            {reviewing ? 'Edit Plan' : 'Back'}
          </button>

          <button
            type="button"
            disabled={
              saving ||
              (!reviewing &&
                Boolean(stepError)) ||
              (reviewing && previewOnly)
            }
            onClick={
              reviewing
                ? handleCreatePlan
                : goNext
            }
          >
            {saving
              ? 'Creating Plan...'
              : reviewing
                ? 'Create Plan'
                : stepIndex ===
                    CREATE_PLAN_STEPS.length - 1
                  ? 'Review Plan'
                  : 'Next'}
          </button>
        </div>
      </main>

      {createdPlanId && (
        <div className="confirmation-overlay">
          <section
            className="confirmation-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="plan-created-title"
          >
            <div
              className="confirmation-checkmark"
              aria-hidden="true"
            >
              ✓
            </div>

            <h2 id="plan-created-title">
              Plan Created
            </h2>

            <p>
              Your schedule and targets are ready.
              We’ll guide you into your official start
              day.
            </p>

            <button type="button" onClick={onBack}>
              Back to Dashboard
            </button>
          </section>
        </div>
      )}
    </>
  )
}
