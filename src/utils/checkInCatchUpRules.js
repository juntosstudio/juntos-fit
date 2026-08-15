import { addDays } from './dates'

export const WEEKLY_GRACE_DAYS = 3

export const WEEKLY_DUE_STATE = {
  UPCOMING: 'upcoming',
  DUE: 'due',
  OVERDUE: 'overdue',
  EXPIRED: 'expired',
  SUBMITTED: 'submitted',
  FINALIZED: 'finalized',
  MISSED: 'missed',
}

function uniqueSortedDates(dates) {
  return [...new Set((dates ?? []).filter(Boolean))].sort()
}

export function getWeeklyGraceEndDate(weeklyDueDate) {
  if (!weeklyDueDate) return null
  return addDays(weeklyDueDate, WEEKLY_GRACE_DAYS)
}

export function getWeeklyDueState({
  weeklyDueDate,
  todayDate,
  weeklyStatus = null,
}) {
  if (weeklyStatus === 'finalized' || weeklyStatus === 'completed') {
    return WEEKLY_DUE_STATE.FINALIZED
  }
  if (weeklyStatus === 'missed') return WEEKLY_DUE_STATE.MISSED
  if (weeklyStatus === 'submitted') return WEEKLY_DUE_STATE.SUBMITTED
  if (!weeklyDueDate || !todayDate) return null
  if (todayDate < weeklyDueDate) return WEEKLY_DUE_STATE.UPCOMING
  if (todayDate === weeklyDueDate) return WEEKLY_DUE_STATE.DUE

  const graceEndDate = getWeeklyGraceEndDate(weeklyDueDate)
  if (todayDate <= graceEndDate) return WEEKLY_DUE_STATE.OVERDUE
  return WEEKLY_DUE_STATE.EXPIRED
}

export function getWeeklyGraceDaysRemaining({
  weeklyDueDate,
  todayDate,
}) {
  const state = getWeeklyDueState({ weeklyDueDate, todayDate })
  if (state === WEEKLY_DUE_STATE.DUE) return WEEKLY_GRACE_DAYS
  if (state !== WEEKLY_DUE_STATE.OVERDUE) return null

  const graceEndDate = getWeeklyGraceEndDate(weeklyDueDate)
  let remaining = 0
  let cursor = todayDate

  while (cursor < graceEndDate) {
    remaining += 1
    cursor = addDays(cursor, 1)
  }
  return remaining
}

export function getUnresolvedDailyDates({
  expectedDailyDates,
  completedDailyDates,
  unavailableDailyDates,
  todayDate,
  weeklyDueDate,
}) {
  const completed = new Set(completedDailyDates ?? [])
  const unavailable = new Set(unavailableDailyDates ?? [])

  return uniqueSortedDates(expectedDailyDates).filter((date) => {
    if (todayDate && date >= todayDate) return false
    if (weeklyDueDate && date >= weeklyDueDate) return false
    return !completed.has(date) && !unavailable.has(date)
  })
}

export function canBackfillDaily({
  dailyDate,
  todayDate,
  weeklyDueDate,
  weeklyStatus = null,
}) {
  if (!dailyDate || !todayDate || !weeklyDueDate) return false
  if (dailyDate >= todayDate) return false
  if (dailyDate >= weeklyDueDate) return false

  const state = getWeeklyDueState({
    weeklyDueDate,
    todayDate,
    weeklyStatus,
  })

  return [
    WEEKLY_DUE_STATE.UPCOMING,
    WEEKLY_DUE_STATE.DUE,
    WEEKLY_DUE_STATE.OVERDUE,
  ].includes(state)
}

export function getWeeklyReadiness({ unresolvedDailyDates }) {
  const unresolved = uniqueSortedDates(unresolvedDailyDates)
  return {
    ready: unresolved.length === 0,
    unresolvedDailyDates: unresolved,
    unresolvedCount: unresolved.length,
  }
}

export function buildCatchUpItems({
  weekNumber,
  todayDate,
  weeklyDueDate,
  weeklyStatus = null,
  unresolvedDailyDates,
}) {
  const items = uniqueSortedDates(unresolvedDailyDates)
    .filter((date) =>
      canBackfillDaily({
        dailyDate: date,
        todayDate,
        weeklyDueDate,
        weeklyStatus,
      }),
    )
    .map((date) => ({
      type: 'daily',
      date,
      weekNumber,
    }))

  const weeklyState = getWeeklyDueState({
    weeklyDueDate,
    todayDate,
    weeklyStatus,
  })

  if (weeklyState === WEEKLY_DUE_STATE.OVERDUE) {
    items.push({
      type: 'weekly',
      date: weeklyDueDate,
      weekNumber,
      closesOn: getWeeklyGraceEndDate(weeklyDueDate),
    })
  }

  return items
}

export function getMissedCheckInCount(args) {
  return buildCatchUpItems(args).length
}

export function requiresMissedWeekRecovery({
  weeklyDueDate,
  todayDate,
  weeklyStatus = null,
}) {
  return getWeeklyDueState({
    weeklyDueDate,
    todayDate,
    weeklyStatus,
  }) === WEEKLY_DUE_STATE.EXPIRED
}

export function canEditSubmittedWeekly({
  weeklyStatus,
  submittedLocalDate,
  currentLocalDate,
}) {
  return (
    weeklyStatus === 'submitted' &&
    Boolean(submittedLocalDate) &&
    submittedLocalDate === currentLocalDate
  )
}

export function shouldFinalizeSubmittedWeekly({
  weeklyStatus,
  submittedLocalDate,
  currentLocalDate,
}) {
  return (
    weeklyStatus === 'submitted' &&
    Boolean(submittedLocalDate) &&
    Boolean(currentLocalDate) &&
    currentLocalDate > submittedLocalDate
  )
}
