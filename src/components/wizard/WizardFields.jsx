import {
  getWizardFieldState,
  joinWizardClasses,
} from '../../utils/wizardFieldState'

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
  autoComplete,
  placeholder,
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
      optional,
    })

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
          type={type}
          name={name}
          value={value}
          min={min}
          max={max}
          step={step}
          inputMode={inputMode}
          autoComplete={autoComplete}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          onBlur={onBlur}
          onChange={(event) =>
            onChange(event.target.value)
          }
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
        feedback={feedback}
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
