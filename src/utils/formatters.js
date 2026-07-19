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

// Formats a date key like "July 17th".
export function formatDateWithOrdinal(dateKey) {
  if (!dateKey) return ''

  const date = new Date(`${dateKey}T00:00:00Z`)
  const day = date.getUTCDate()

  const remainder100 = day % 100
  const remainder10 = day % 10

  let suffix = 'th'

  if (remainder100 < 11 || remainder100 > 13) {
    if (remainder10 === 1) suffix = 'st'
    if (remainder10 === 2) suffix = 'nd'
    if (remainder10 === 3) suffix = 'rd'
  }

  const month = date.toLocaleDateString('en-US', {
    month: 'long',
    timeZone: 'UTC',
  })

  return `${month} ${day}${suffix}`
}