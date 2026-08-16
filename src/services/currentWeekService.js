import { supabase } from '../lib/supabase'
import {
  DAILY_CHECKIN_FIELDS,
} from './dailyCheckInService'
import {
  addDays,
  getReportingWeekForDate,
  getTodayDateKey,
  isWeeklyCheckInDate,
} from '../utils/dates'

const CURRENT_WEEKLY_FIELDS = `
  id,
  coaching_plan_id,
  daily_checkin_id,
  checkin_date,
  week_number,
  status,
  resume_step,
  submitted_at,
  created_at,
  updated_at
`

const CURRENT_RESOLUTION_FIELDS = `
  id,
  coaching_plan_id,
  checkin_date,
  resolution,
  resolved_at
`

function dateRange(startDate, endDate) {
  if (!startDate || !endDate || startDate > endDate) {
    return []
  }

  const dates = []
  let cursor = startDate

  while (cursor <= endDate) {
    dates.push(cursor)
    cursor = addDays(cursor, 1)
  }

  return dates
}

function getDayStatus({
  date,
  today,
  plan,
  dailyRow,
  weeklyRow,
  resolution,
}) {
  if (date === plan.start_date) {
    return 'start-day'
  }

  if (
    weeklyRow?.status === 'completed' ||
    weeklyRow?.status === 'finalized' ||
    weeklyRow?.status === 'submitted'
  ) {
    return 'weekly-completed'
  }

  if (weeklyRow?.status === 'draft') {
    return 'weekly-draft'
  }

  if (dailyRow) {
    return 'completed'
  }

  if (resolution?.resolution === 'unavailable') {
    return 'unavailable'
  }

  if (date > today) {
    return 'upcoming'
  }

  const weeklyDate = isWeeklyCheckInDate(
    plan.start_date,
    plan.checkin_day,
    date,
  )

  if (date === today) {
    return weeklyDate
      ? 'today-weekly'
      : 'today'
  }

  return weeklyDate
    ? 'missing-weekly'
    : 'missing'
}

export async function loadCurrentWeekCheckIns(
  plan,
  today = getTodayDateKey(),
) {
  if (!plan?.id || !plan?.start_date) {
    return null
  }

  const reportingWeek =
    getReportingWeekForDate(
      plan.start_date,
      plan.checkin_day,
      today,
    )

  if (!reportingWeek) {
    return null
  }

  const weekStart =
    reportingWeek.reportingStart
  const weekEnd =
    reportingWeek.reportingEnd

  const [
    dailyResult,
    weeklyResult,
    resolutionResult,
  ] = await Promise.all([
    supabase
      .from('daily_checkins')
      .select(DAILY_CHECKIN_FIELDS)
      .eq('coaching_plan_id', plan.id)
      .gte('checkin_date', weekStart)
      .lte('checkin_date', weekEnd)
      .order('checkin_date', {
        ascending: true,
      }),

    supabase
      .from('weekly_checkins')
      .select(CURRENT_WEEKLY_FIELDS)
      .eq('coaching_plan_id', plan.id)
      .gte('checkin_date', weekStart)
      .lte('checkin_date', weekEnd)
      .order('checkin_date', {
        ascending: true,
      }),

    supabase
      .from('checkin_day_resolutions')
      .select(CURRENT_RESOLUTION_FIELDS)
      .eq('coaching_plan_id', plan.id)
      .gte('checkin_date', weekStart)
      .lte('checkin_date', weekEnd)
      .order('checkin_date', {
        ascending: true,
      }),
  ])

  if (dailyResult.error) {
    throw dailyResult.error
  }

  if (weeklyResult.error) {
    throw weeklyResult.error
  }

  if (resolutionResult.error) {
    throw resolutionResult.error
  }

  const dailyByDate = new Map(
    (dailyResult.data ?? []).map((row) => [
      row.checkin_date,
      row,
    ]),
  )

  const weeklyByDate = new Map(
    (weeklyResult.data ?? []).map((row) => [
      row.checkin_date,
      row,
    ]),
  )

  const resolutionByDate = new Map(
    (resolutionResult.data ?? []).map((row) => [
      row.checkin_date,
      row,
    ]),
  )

  const days = dateRange(
    weekStart,
    weekEnd,
  ).map((date) => {
    const dailyRow =
      dailyByDate.get(date) ?? null
    const weeklyRow =
      weeklyByDate.get(date) ?? null
    const resolution =
      resolutionByDate.get(date) ?? null

    return {
      date,
      dailyRow,
      weeklyRow,
      resolution,
      isWeeklyDate:
        isWeeklyCheckInDate(
          plan.start_date,
          plan.checkin_day,
          date,
        ),
      status: getDayStatus({
        date,
        today,
        plan,
        dailyRow,
        weeklyRow,
        resolution,
      }),
    }
  })

  return {
    weekNumber:
      reportingWeek.weekNumber,
    programStart:
      reportingWeek.programStart,
    programEnd:
      reportingWeek.programEnd,
    weekStart,
    weekEnd,
    today,
    days,
  }
}
