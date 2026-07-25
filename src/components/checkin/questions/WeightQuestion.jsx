import {
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  WizardChoiceGroup,
  WizardNumberField,
  WizardQuestion,
} from '../../wizard'

export const WEIGHT_QUESTION_HELPER =
  'Use the same scale and similar conditions each time.'

export const NO_WEIGHT_OPTIONS = [
  {
    value: 'traveling',
    label: 'Traveling',
  },
  {
    value: 'no_scale',
    label: 'No scale available',
  },
  {
    value: 'scale_issue',
    label: 'Scale problem / broken scale',
  },
  {
    value: 'skipped',
    label: 'Skipped weighing this morning',
  },
]

const NO_WEIGHT_VALUES = new Set(
  NO_WEIGHT_OPTIONS.map(
    (option) => option.value,
  ),
)

// Shared weight question used by Start, Daily, and Weekly.
export function WeightQuestion({
  id,
  title,
  label,
  value,
  status,
  disabled = false,
  readOnly = false,
  feedback,
  state,
  onValueChange,
  onStatusChange,
}) {
  const hasKnownNoWeightReason =
    NO_WEIGHT_VALUES.has(status)

  const hasUnspecifiedNoWeight =
    Boolean(status) &&
    status !== 'recorded' &&
    !hasKnownNoWeightReason

  const [
    showNoWeightReasons,
    setShowNoWeightReasons,
  ] = useState(hasKnownNoWeightReason)

  const inputRef = useRef(null)

  useEffect(() => {
    setShowNoWeightReasons(
      hasKnownNoWeightReason,
    )
  }, [hasKnownNoWeightReason])

  useEffect(() => {
    if (
      !disabled &&
      !readOnly &&
      !showNoWeightReasons &&
      !hasUnspecifiedNoWeight
    ) {
      inputRef.current?.focus()
    }
  }, [
    disabled,
    hasUnspecifiedNoWeight,
    readOnly,
    showNoWeightReasons,
  ])

  function changeWeight(nextValue) {
    onValueChange(nextValue)
    onStatusChange(
      nextValue === '' ? '' : 'recorded',
    )
  }

  function chooseNoWeightReason(reason) {
    onValueChange('')
    onStatusChange(reason)
  }

  function enterWeightInstead() {
    onStatusChange('')
    onValueChange('')
    setShowNoWeightReasons(false)
  }

  if (
    hasUnspecifiedNoWeight &&
    (readOnly || disabled)
  ) {
    return (
      <WizardQuestion
        title={title}
        helper={WEIGHT_QUESTION_HELPER}
      >
        <p>No weight recorded.</p>
      </WizardQuestion>
    )
  }

  if (showNoWeightReasons) {
    const reasonOptions =
      disabled || readOnly
        ? NO_WEIGHT_OPTIONS.map((option) => ({
            ...option,
            disabled: true,
          }))
        : NO_WEIGHT_OPTIONS

    return (
      <WizardQuestion
        title="Why don’t you have a weight today?"
        helper={WEIGHT_QUESTION_HELPER}
      >
        <WizardChoiceGroup
          name={`${id}-status`}
          value={status}
          options={reasonOptions}
          onChange={chooseNoWeightReason}
        />

        {!disabled && !readOnly && (
          <button
            type="button"
            className="text-button"
            onClick={enterWeightInstead}
          >
            Enter a weight instead
          </button>
        )}
      </WizardQuestion>
    )
  }

  if (hasUnspecifiedNoWeight) {
    return (
      <WizardQuestion
        title={title}
        helper={WEIGHT_QUESTION_HELPER}
      >
        <p>No weight recorded.</p>

        <button
          type="button"
          className="text-button"
          onClick={enterWeightInstead}
        >
          Enter a weight instead
        </button>
      </WizardQuestion>
    )
  }

  return (
    <WizardQuestion
      title={title}
      helper={WEIGHT_QUESTION_HELPER}
    >
      <WizardNumberField
        id={id}
        inputRef={inputRef}
        label={label}
        value={value}
        suffix="lbs"
        min="1"
        step="0.1"
        feedback={feedback}
        state={state}
        disabled={disabled}
        readOnly={readOnly}
        onChange={changeWeight}
      />

      {!readOnly && (
        <>
          <p className="answer-divider">or</p>

          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              setShowNoWeightReasons(true)
            }
          >
            I don’t have a weight today
          </button>
        </>
      )}
    </WizardQuestion>
  )
}
