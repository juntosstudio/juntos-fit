import { useEffect, useRef } from 'react'

// Displays one set of selectable answers.
export function ChoiceButtons({
  name,
  value,
  options,
  onChange,
}) {
  return (
    <div className="choice-list">
      {options.map((option) => (
        <label key={String(option.value)}>
          <input
            type="radio"
            name={name}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />

          <span>{option.label}</span>
        </label>
      ))}
    </div>
  )
}

// Displays an unanswered 1–5 slider with a live meaning.
export function AnswerSlider({
  name,
  value,
  labels,
  onChange,
  reversed = false,
}) {
  const answered = value !== ''
  const storedValue = answered ? Number(value) : 3

  // Reverse the displayed position without reversing the track direction.
  const sliderValue =
    answered && reversed
      ? 6 - storedValue
      : storedValue

  const selectedLabel = answered
    ? labels[storedValue]
    : ''

  function handleChange(event) {
    const displayedValue = Number(event.target.value)

    const nextValue = reversed
      ? 6 - displayedValue
      : displayedValue

    onChange(String(nextValue))
  }

  return (
    <div className="slider-answer">
      <p aria-live="polite">
        {answered
          ? selectedLabel
          : 'Move the slider to answer'}
      </p>

      <input
        type="range"
        name={name}
        min="1"
        max="5"
        step="1"
        value={sliderValue}
        className={
          answered
            ? 'answer-slider is-answered'
            : 'answer-slider is-unanswered'
        }
        aria-valuetext={
          selectedLabel || 'Not answered'
        }
        onChange={handleChange}
      />

      <div className="slider-endpoints">
        <span>
          {reversed ? labels[5] : labels[1]}
        </span>

        <span>
          {reversed ? labels[1] : labels[5]}
        </span>
      </div>
    </div>
  )
}

// Focuses a text box whenever its question appears.
export function FocusedTextarea({
  focusKey,
  value,
  onChange,
  placeholder,
  rows = 6,
  optional = false,
}) {
  const textareaRef = useRef(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [focusKey])

  return (
    <div>
      {optional && (
        <p className="question-helper">
          Optional — leave blank and tap Next.
        </p>
      )}

      <textarea
        ref={textareaRef}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
      />
    </div>
  )
}