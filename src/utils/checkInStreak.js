import { addDays } from './dates'

// Calculates the current consecutive program check-in streak.
//
// Start, Daily, and completed Weekly Check-Ins all count as
// check-in days. A pending check-in today preserves the streak
// earned through yesterday; a real gap becomes visible the next
// day and breaks the streak.
export function calculateProgramCheckInStreak({
  dailyCheckInDates = [],
  weeklyCheckInDates = [],
  startCheckIn = null,
  planStartDate,
  today,
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
        checkin?.checkin_date,
      )
      .filter(Boolean),
  )

  for (const weekly of weeklyCheckInDates) {
    if (weekly?.checkin_date) {
      savedDates.add(weekly.checkin_date)
    }
  }

  if (startCheckIn?.status === 'completed') {
    savedDates.add(
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
