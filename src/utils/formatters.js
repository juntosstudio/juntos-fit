// Formats a database date without shifting it into another time zone.
export function formatDate(dateKey) {
  if (!dateKey) {
    return '—'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${dateKey}T00:00:00Z`))
}

// Converts the stored goal value into display text.
export function formatGoal(goal) {
  const goalLabels = {
    fat_loss: 'Fat Loss',
    maintenance: 'Maintenance',
    muscle_gain: 'Muscle Gain',
  }

  return goalLabels[goal] ?? goal
}