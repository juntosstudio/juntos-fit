import {
  dateKeyToUtcMilliseconds,
} from './dates'

const MILLISECONDS_PER_DAY =
  24 * 60 * 60 * 1000

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

  const daysSinceStart = Math.floor(
    (
      dateKeyToUtcMilliseconds(today) -
      dateKeyToUtcMilliseconds(
        plan.start_date,
      )
    ) /
      MILLISECONDS_PER_DAY,
  )

  return Math.min(
    Math.floor(daysSinceStart / 7) + 1,
    Number(
      plan.program_length_weeks,
    ),
  )
}
