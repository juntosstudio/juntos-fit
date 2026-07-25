import {
  WizardNumberField,
  WizardQuestion,
} from '../../wizard'

export const BODY_FAT_QUESTION_HELPER =
  'Use the same scale and similar conditions each time.'

// Shared scale-based body-fat question used by Start and Weekly.
export function BodyFatQuestion({
  id,
  value,
  unavailable = false,
  disabled = false,
  readOnly = false,
  feedback,
  state,
  onValueChange,
  onUnavailableChange,
  onSkip,
}) {
  function changeBodyFat(nextValue) {
    // The parent updates both the value and its recorded
    // status. Clearing unavailable here would erase the
    // Weekly recorded status after every keystroke.
    onValueChange(nextValue)
  }

  function skipBodyFat() {
    onValueChange('')
    onUnavailableChange(true)
    onSkip?.()
  }

  function enterReadingInstead() {
    onUnavailableChange(false)
    onValueChange('')
  }

  if (unavailable) {
    return (
      <WizardQuestion
        title="What was your body fat this morning?"
        helper={BODY_FAT_QUESTION_HELPER}
      >
        <p>No body-fat reading today.</p>

        {!disabled && !readOnly && (
          <button
            type="button"
            className="text-button"
            onClick={enterReadingInstead}
          >
            Enter a body-fat reading instead
          </button>
        )}
      </WizardQuestion>
    )
  }

  return (
    <WizardQuestion
      title="What was your body fat this morning?"
      helper={BODY_FAT_QUESTION_HELPER}
    >
      <WizardNumberField
        id={id}
        label="Body fat"
        value={value}
        suffix="%"
        min="0.1"
        max="100"
        step="0.1"
        maxDecimalPlaces={1}
        feedback={feedback}
        state={state}
        disabled={disabled}
        readOnly={readOnly}
        onChange={changeBodyFat}
      />

      {!readOnly && (
        <>
          <p className="answer-divider">or</p>

          <button
            type="button"
            disabled={disabled}
            onClick={skipBodyFat}
          >
            I don’t have a body-fat reading today
          </button>
        </>
      )}
    </WizardQuestion>
  )
}
