import {
  getWizardFieldState,
  joinWizardClasses,
} from '../../utils/wizardFieldState'

function valuesMatch(left, right) {
  return (
    Object.is(left, right) ||
    String(left) === String(right)
  )
}

// Shared radio-card answer group.
// Options may include label, description, badge,
// disabled, and className.
export function WizardChoiceGroup({
  name,
  value,
  options,
  onChange,
  optional = false,
  answered,
  state,
  className = '',
  ariaLabel,
}) {
  const visualState =
    state ??
    getWizardFieldState({
      value,
      answered,
      optional,
    })

  return (
    <div
      className={joinWizardClasses(
        'wizard-choice-group',
        visualState,
        className,
      )}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const checked = valuesMatch(
          value,
          option.value,
        )

        return (
          <label
            key={String(option.value)}
            className={joinWizardClasses(
              'wizard-choice-option',
              option.disabled &&
                'is-disabled',
              option.className,
            )}
          >
            <input
              type="radio"
              name={name}
              value={String(option.value)}
              checked={checked}
              disabled={option.disabled}
              onChange={() =>
                onChange(option.value)
              }
            />

            <span className="wizard-choice-copy">
              <span className="wizard-choice-label">
                {option.label}
              </span>

              {option.description && (
                <span className="wizard-choice-description">
                  {option.description}
                </span>
              )}

              {option.badge && (
                <small className="wizard-choice-badge">
                  {option.badge}
                </small>
              )}
            </span>
          </label>
        )
      })}
    </div>
  )
}
