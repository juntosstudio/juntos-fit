import {
  getReportingWeekNumber,
  getWeeklyCheckInDateForWeek,
} from './dates'

export function getPlanWeekNumber(
  plan,
  today,
) {
  if (
    !plan?.start_date ||
    !plan?.program_length_weeks ||
    !today ||
    today < plan.start_date
  ) {
    return null
  }

  const reportingWeek =
    getReportingWeekNumber(
      plan.start_date,
      plan.checkin_day,
      today,
    )

  if (!reportingWeek) {
    return null
  }

  return Math.min(
    reportingWeek,
    Number(
      plan.program_length_weeks,
    ),
  )
}


const COMPLETED_WEEKLY_STATUSES = new Set([
  'completed',
  'finalized',
  'submitted',
])

// Plan Progress follows the program/prescription week after a
// closing Weekly is finalized, while reporting views remain on
// the week that was just closed until the next morning.
export function getPlanProgressWeekNumber(
  plan,
  today,
  todayWeeklyCheckIn = null,
) {
  const reportingWeekNumber =
    getPlanWeekNumber(
      plan,
      today,
    )

  if (!reportingWeekNumber) {
    return null
  }

  const programLength = Number(
    plan?.program_length_weeks,
  )

  const weeklyDate =
    getWeeklyCheckInDateForWeek(
      plan?.start_date,
      plan?.checkin_day,
      reportingWeekNumber,
    )

  const closedReportingWeekToday =
    weeklyDate === today &&
    Number(
      todayWeeklyCheckIn?.week_number,
    ) === reportingWeekNumber &&
    todayWeeklyCheckIn?.checkin_date ===
      today &&
    COMPLETED_WEEKLY_STATUSES.has(
      todayWeeklyCheckIn?.status,
    )

  if (
    closedReportingWeekToday &&
    Number.isInteger(programLength) &&
    reportingWeekNumber <
      programLength
  ) {
    return reportingWeekNumber + 1
  }

  return reportingWeekNumber
}
