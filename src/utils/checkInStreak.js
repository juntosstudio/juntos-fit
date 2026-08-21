import { addDays } from './dates'

function getTimestampDateKey(timestamp, timeZone) {
  if (!timestamp) {
    return null
  }

  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || undefined,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })

    const parts = formatter.formatToParts(date)
    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    )

    return `${values.year}-${values.month}-${values.day}`
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

function getDailyCompletionDate(checkin, timeZone) {
  return (
    getTimestampDateKey(checkin?.created_at, timeZone) ??
    checkin?.checkin_date ??
    null
  )
}

function getWeeklyCompletionDate(checkin, timeZone) {
  return (
    getTimestampDateKey(checkin?.submitted_at, timeZone) ??
    getTimestampDateKey(checkin?.created_at, timeZone) ??
    checkin?.checkin_date ??
    null
  )
}

// Calculates the current consecutive program check-in streak.
//
// The streak is based on when a completed check-in was actually
// submitted, not the historical date it represents. That means a
// backfilled Daily or late Weekly never repairs a previously broken
// streak. It can start a new streak on the day it is completed.
//
// Start, Daily, and completed Weekly Check-Ins all count as check-in
// activity. A pending check-in today preserves the streak earned
// through yesterday; a real gap becomes visible the next day and
// breaks the streak.
export function calculateProgramCheckInStreak({
  dailyCheckInDates = [],
  weeklyCheckInDates = [],
  startCheckIn = null,
  planStartDate,
  today,
  timeZone,
}) {
  if (
    !planStartDate ||
    !today ||
    today < planStartDate
  ) {
    return 0
  }

  const savedDates = new Set(
    dailyCheckInDates
      .map((checkin) =>
        getDailyCompletionDate(checkin, timeZone),
      )
      .filter(Boolean),
  )

  for (const weekly of weeklyCheckInDates) {
    const completionDate = getWeeklyCompletionDate(
      weekly,
      timeZone,
    )

    if (completionDate) {
      savedDates.add(completionDate)
    }
  }

  if (startCheckIn?.status === 'completed') {
    savedDates.add(
      getTimestampDateKey(
        startCheckIn.completed_at,
        timeZone,
      ) ??
        startCheckIn.checkin_date ??
        planStartDate,
    )
  }

  let currentDate = savedDates.has(today)
    ? today
    : addDays(today, -1)

  let streakDays = 0

  while (
    currentDate >= planStartDate &&
    savedDates.has(currentDate)
  ) {
    streakDays += 1
    currentDate = addDays(currentDate, -1)
  }

  return streakDays
}
