import {
  getReportingWeekNumber,
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
