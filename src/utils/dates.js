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

// Finds the simple seven-day window anchored to Start Day.
//
// This is the prescription / behavior calendar when the selected
// Weekly Check-In weekday matches Start Day. Morning reporting has a
// deliberate one-day offset; use the reporting helpers below for
// Dashboard / Daily-history grouping.
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

// Returns the weekday for a YYYY-MM-DD date key.
// Sunday = 0 through Saturday = 6.
export function getDateKeyWeekday(dateKey) {
  if (!dateKey) {
    return null
  }

  return new Date(
    dateKeyToUtcMilliseconds(dateKey),
  ).getUTCDay()
}

// Finds the first selected weekly check-in weekday
// occurring at least seven full days after plan start.
export function getFirstWeeklyCheckInDate(
  startDate,
  checkinDay,
) {
  if (
    !startDate ||
    !Number.isInteger(Number(checkinDay))
  ) {
    return null
  }

  const firstEligibleDate = addDays(
    startDate,
    7,
  )

  const firstEligibleWeekday =
    getDateKeyWeekday(firstEligibleDate)

  const daysUntilCheckIn =
    (Number(checkinDay) -
      firstEligibleWeekday +
      7) %
    7

  return addDays(
    firstEligibleDate,
    daysUntilCheckIn,
  )
}

// Returns the scheduled Weekly Check-In date that closes a numbered
// reporting week. Week 1 closes on the first Weekly Check-In date.
export function getWeeklyCheckInDateForWeek(
  startDate,
  checkinDay,
  weekNumber,
) {
  const numericWeek = Number(weekNumber)

  if (
    !Number.isInteger(numericWeek) ||
    numericWeek < 1
  ) {
    return null
  }

  const firstWeeklyDate =
    getFirstWeeklyCheckInDate(
      startDate,
      checkinDay,
    )

  return firstWeeklyDate
    ? addDays(
        firstWeeklyDate,
        (numericWeek - 1) * 7,
      )
    : null
}

// Returns the week whose results are currently being reported.
//
// Important business rule:
// - Start Day begins the diet/workout prescription for Week 1.
// - The next morning's Daily Check-In reports Start Day behavior.
// - The Weekly Check-In morning closes the week by reporting the
//   previous day's behavior plus Weekly-only data.
// - That Weekly calendar day also begins the next prescription week,
//   but the Dashboard does not roll to the next reporting week until
//   the following morning.
export function getReportingWeekNumber(
  startDate,
  checkinDay,
  currentDate,
) {
  if (
    !startDate ||
    !currentDate ||
    currentDate < startDate
  ) {
    return null
  }

  const firstWeeklyDate =
    getFirstWeeklyCheckInDate(
      startDate,
      checkinDay,
    )

  if (!firstWeeklyDate) {
    return null
  }

  if (currentDate <= firstWeeklyDate) {
    return 1
  }

  const daysSinceFirstWeekly = Math.floor(
    (dateKeyToUtcMilliseconds(currentDate) -
      dateKeyToUtcMilliseconds(firstWeeklyDate)) /
      MILLISECONDS_PER_DAY,
  )

  return Math.ceil(daysSinceFirstWeekly / 7) + 1
}

// Returns both clocks for one numbered week:
//
// programStart/programEnd = the days the prescription is lived
// reportingStart/reportingEnd = the mornings that report those days
// weeklyDueDate = reportingEnd
export function getReportingWeekRange(
  startDate,
  checkinDay,
  weekNumber,
) {
  const numericWeek = Number(weekNumber)
  const weeklyDueDate =
    getWeeklyCheckInDateForWeek(
      startDate,
      checkinDay,
      numericWeek,
    )

  if (!weeklyDueDate) {
    return null
  }

  const programStart =
    numericWeek === 1
      ? startDate
      : getWeeklyCheckInDateForWeek(
          startDate,
          checkinDay,
          numericWeek - 1,
        )

  if (!programStart) {
    return null
  }

  return {
    weekNumber: numericWeek,
    programStart,
    programEnd: addDays(
      weeklyDueDate,
      -1,
    ),
    reportingStart: addDays(
      programStart,
      1,
    ),
    reportingEnd: weeklyDueDate,
    weeklyDueDate,
  }
}

// Returns the complete reporting/program range for the week that the
// supplied calendar date currently belongs to from the Dashboard's
// reporting perspective.
export function getReportingWeekForDate(
  startDate,
  checkinDay,
  currentDate,
) {
  const weekNumber =
    getReportingWeekNumber(
      startDate,
      checkinDay,
      currentDate,
    )

  return weekNumber
    ? getReportingWeekRange(
        startDate,
        checkinDay,
        weekNumber,
      )
    : null
}

// Returns true only on the recurring weekly check-in
// dates anchored to the plan's selected weekday.
export function isWeeklyCheckInDate(
  startDate,
  checkinDay,
  currentDate,
) {
  const firstWeeklyDate =
    getFirstWeeklyCheckInDate(
      startDate,
      checkinDay,
    )

  if (
    !firstWeeklyDate ||
    !currentDate ||
    currentDate < firstWeeklyDate
  ) {
    return false
  }

  const daysSinceFirstWeekly =
    Math.floor(
      (dateKeyToUtcMilliseconds(currentDate) -
        dateKeyToUtcMilliseconds(
          firstWeeklyDate,
        )) /
        MILLISECONDS_PER_DAY,
    )

  return daysSinceFirstWeekly % 7 === 0
}
