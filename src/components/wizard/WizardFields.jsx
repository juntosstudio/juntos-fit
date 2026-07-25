import {
  useState,
} from 'react'
import {
  getWizardFieldState,
  joinWizardClasses,
} from '../../utils/wizardFieldState'

function getRejectedNumberInputMessage({
  integerOnly,
  maxDecimalPlaces,
}) {
  if (integerOnly) {
    return 'Enter a whole number—no decimals.'
  }

  if (
    Number.isInteger(maxDecimalPlaces) &&
    maxDecimalPlaces >= 0
  ) {
    if (maxDecimalPlaces === 0) {
      return 'Enter a whole number—no decimals.'
    }

    if (maxDecimalPlaces === 1) {
      return (
        'Enter no more than one digit after the ' +
        'decimal point.'
      )
    }

    return (
      `Enter no more than ${maxDecimalPlaces} digits ` +
      'after the decimal point.'
    )
  }

  return 'Enter a valid number.'
}

export function isAllowedWizardNumberInput(
  value,
  {
    integerOnly = false,
    maxDecimalPlaces,
  } = {},
) {
  if (value === '') {
    return true
  }

  if (integerOnly) {
    return /^\d+$/.test(value)
  }

  if (
    Number.isInteger(maxDecimalPlaces) &&
    maxDecimalPlaces >= 0
  ) {
    const pattern =
      maxDecimalPlaces === 0
        ? /^\d+$/
        : new RegExp(
            `^\\d+(?:\\.\\d{0,${maxDecimalPlaces}})?$`,
          )

    return pattern.test(value)
  }

  return true
}

function FieldFeedback({
  feedback,
  state,
}) {
  if (!feedback) return null

  return (
    <small
      className={joinWizardClasses(
        'wizard-field-feedback',
        state,
      )}
    >
      {feedback}
    </small>
  )
}

// Shared one-line field used for dates, numbers,
// text, email, and similar answers.
export function WizardInputField({
  id,
  label,
  type = 'text',
  name,
  value,
  suffix,
  helper,
  feedback,
  optional = false,
  answered,
  state,
  className = '',
  inputClassName = '',
  inputRef,
  min,
  max,
  step,
  inputMode,
  integerOnly = false,
  maxDecimalPlaces,
  autoComplete,
  placeholder,
  disabled = false,
  readOnly = false,
  onBlur,
  onChange,
}) {
  const [
    rejectedInputMessage,
    setRejectedInputMessage,
  ] = useState('')

  const visualState =
    rejectedInputMessage
      ? 'is-invalid'
      : state ??
        getWizardFieldState({
          value,
          answered,
          optional,
        })

  const displayedFeedback =
    rejectedInputMessage || feedback

  const hasNumberFormatGuard =
    type === 'number' &&
    (integerOnly ||
      Number.isInteger(maxDecimalPlaces))

  // Browser number inputs can visibly hold an intermediate
  // value such as "52." without exposing that same string
  // through event.target.value. A text input with a numeric
  // keyboard lets the shared guard handle the exact text.
  const renderedType =
    hasNumberFormatGuard ? 'text' : type

  function handleBlur(event) {
    if (
      hasNumberFormatGuard &&
      !integerOnly &&
      String(value).endsWith('.')
    ) {
      onChange(
        String(value).slice(0, -1),
      )
    }

    setRejectedInputMessage('')
    onBlur?.(event)
  }

  return (
    <label
      className={joinWizardClasses(
        'wizard-field',
        'wizard-input-field',
        className,
      )}
      htmlFor={id}
    >
      {label && (
        <span className="wizard-field-label">
          {label}
        </span>
      )}

      <div className="wizard-input-row">
        <input
          ref={inputRef}
          id={id}
          className={joinWizardClasses(
            'wizard-control',
            'interaction-field',
            visualState,
            inputClassName,
          )}
          type={renderedType}
          name={name}
          value={value}
          min={min}
          max={max}
          step={step}
          inputMode={inputMode}
          pattern={
            hasNumberFormatGuard
              ? integerOnly
                ? '[0-9]*'
                : '[0-9]*[.]?[0-9]*'
              : undefined
          }
          autoComplete={autoComplete}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          onBlur={handleBlur}
          onChange={(event) => {
            const nextValue =
              event.target.value

            if (
              hasNumberFormatGuard &&
              !isAllowedWizardNumberInput(
                nextValue,
                {
                  integerOnly,
                  maxDecimalPlaces,
                },
              )
            ) {
              setRejectedInputMessage(
                getRejectedNumberInputMessage({
                  integerOnly,
                  maxDecimalPlaces,
                }),
              )
              return
            }

            setRejectedInputMessage('')
            onChange(nextValue)
          }}
        />

        {suffix && (
          <span className="wizard-input-suffix">
            {suffix}
          </span>
        )}
      </div>

      {helper && (
        <small className="wizard-field-helper">
          {helper}
        </small>
      )}

      <FieldFeedback
        feedback={displayedFeedback}
        state={visualState}
      />
    </label>
  )
}

export function WizardNumberField(props) {
  return (
    <WizardInputField
      {...props}
      type="number"
      inputMode={
        props.inputMode ?? 'decimal'
      }
    />
  )
}

export function WizardDateField(props) {
  return (
    <WizardInputField
      {...props}
      type="date"
    />
  )
}

// Shared long-form answer. Only the textarea itself
// carries the border and answer-state glow.
export function WizardTextarea({
  id,
  label,
  ariaLabel,
  value,
  helper,
  feedback,
  placeholder,
  rows = 6,
  optional = false,
  promptWhenEmpty = false,
  answered,
  state,
  className = '',
  disabled = false,
  readOnly = false,
  onBlur,
  onChange,
}) {
  const visualState =
    state ??
    getWizardFieldState({
      value,
      answered,
      optional:
        optional && !promptWhenEmpty,
    })

  const textarea = (
    <textarea
      id={id}
      className={joinWizardClasses(
        'wizard-control',
        'interaction-field',
        visualState,
      )}
      aria-label={ariaLabel}
      rows={rows}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      onBlur={onBlur}
      onChange={(event) =>
        onChange(event.target.value)
      }
    />
  )

  return (
    <div
      className={joinWizardClasses(
        'wizard-field',
        'wizard-textarea-field',
        className,
      )}
    >
      {label ? (
        <label htmlFor={id}>
          <span className="wizard-field-label">
            {label}
          </span>
          {textarea}
        </label>
      ) : (
        textarea
      )}

      {helper && (
        <small className="wizard-field-helper">
          {helper}
        </small>
      )}

      <FieldFeedback
        feedback={feedback}
        state={visualState}
      />
    </div>
  )
}
