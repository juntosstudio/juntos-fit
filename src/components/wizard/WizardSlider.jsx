import {
  getWizardFieldState,
  joinWizardClasses,
} from '../../utils/wizardFieldState'

// Shared 1–5 answer slider with a visible unanswered
// state and the same completion treatment as other fields.
export function WizardSlider({
  name,
  value,
  labels,
  onChange,
  reversed = false,
  optional = false,
  className = '',
}) {
  const answered =
    value !== '' &&
    value !== null &&
    value !== undefined

  const storedValue = answered
    ? Number(value)
    : 3

  const sliderValue =
    answered && reversed
      ? 6 - storedValue
      : storedValue

  const selectedLabel = answered
    ? labels[storedValue]
    : 'Move the slider to answer'

  const visualState =
    getWizardFieldState({
      value,
      answered,
      optional,
    })

  function handleChange(event) {
    const displayedValue = Number(
      event.target.value,
    )

    const nextValue = reversed
      ? 6 - displayedValue
      : displayedValue

    onChange(String(nextValue))
  }

  return (
    <div
      className={joinWizardClasses(
        'wizard-slider-group',
        visualState,
        className,
      )}
    >
      <p aria-live="polite">
        {selectedLabel}
      </p>

      <input
        className="wizard-slider"
        type="range"
        name={name}
        min="1"
        max="5"
        step="1"
        value={sliderValue}
        aria-valuetext={selectedLabel}
        onChange={handleChange}
      />

      <div className="wizard-slider-endpoints">
        <span>
          {reversed
            ? labels[5]
            : labels[1]}
        </span>

        <span>
          {reversed
            ? labels[1]
            : labels[5]}
        </span>
      </div>
    </div>
  )
}
