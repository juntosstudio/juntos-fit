const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

// Returns today's local calendar date as YYYY-MM-DD.
export function getTodayDateKey() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

// Converts a YYYY-MM-DD string to a UTC timestamp.
export function dateKeyToUtcMilliseconds(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number)

  return Date.UTC(year, month - 1, day)
}

// Adds calendar days without introducing local-time-zone drift.
export function addDays(dateKey, numberOfDays) {
  const date = new Date(
    dateKeyToUtcMilliseconds(dateKey) +
      numberOfDays * MILLISECONDS_PER_DAY,
  )

  return date.toISOString().slice(0, 10)
}

// Finds the active seven-day program window for a given date.
export function getProgramWeekRange(startDate, currentDate) {
  if (currentDate < startDate) {
    return {
      weekStart: startDate,
      weekEnd: addDays(startDate, 6),
    }
  }

  const daysSinceStart = Math.floor(
    (dateKeyToUtcMilliseconds(currentDate) -
      dateKeyToUtcMilliseconds(startDate)) /
      MILLISECONDS_PER_DAY,
  )

  const currentWeekIndex = Math.floor(daysSinceStart / 7)
  const weekStart = addDays(startDate, currentWeekIndex * 7)

  return {
    weekStart,
    weekEnd: addDays(weekStart, 6),
  }
}