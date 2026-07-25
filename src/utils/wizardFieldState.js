// Returns true only when a wizard answer has not been provided.
// Boolean false and numeric zero are valid answers.
export function isWizardAnswerEmpty(value) {
  if (value === null || value === undefined) {
    return true
  }

  if (typeof value === 'string') {
    return value.trim() === ''
  }

  if (Array.isArray(value)) {
    return value.length === 0
  }

  return false
}

// Produces one visual state shared by every wizard control.
export function getWizardFieldState({
  value,
  answered,
  optional = false,
  invalid = false,
  warning = false,
}) {
  if (invalid) return 'is-invalid'
  if (warning) return 'is-warning'

  const hasAnswer =
    typeof answered === 'boolean'
      ? answered
      : !isWizardAnswerEmpty(value)

  if (hasAnswer) return 'has-answer'
  if (optional) return 'is-optional'

  return 'needs-answer'
}

// Joins class names without requiring another dependency.
export function joinWizardClasses(
  ...classNames
) {
  return classNames
    .filter(Boolean)
    .join(' ')
}
