import { supabase } from '../lib/supabase'
import {
  DAILY_CHECKIN_FIELDS,
  loadDailyCheckInForDate,
} from './dailyCheckInService'
import {
  addDays,
  dateKeyToUtcMilliseconds,
  getFirstWeeklyCheckInDate,
  getTodayDateKey,
} from '../utils/dates'
import {
  WEEKLY_DUE_STATE,
  canBackfillDaily,
  getUnresolvedDailyDates,
  getWeeklyDueState,
} from '../utils/checkInCatchUpRules'

const DAY_MS = 24 * 60 * 60 * 1000

const WEEKLY_HISTORY_FIELDS = `
  id,
  coaching_plan_id,
  daily_checkin_id,
  checkin_date,
  week_number,
  status,
  submitted_at,
  photos_required,
  measurement_side,
  neck,
  chest,
  waist,
  hips,
  right_arm,
  left_arm,
  right_thigh,
  left_thigh,
  right_calf,
  left_calf,
  scale_body_fat,
  body_fat_percent,
  body_fat_source,
  body_fat_method,
  sleep_quality,
  energy_level,
  recovery_score,
  stress_level,
  menstrual_cycle_context,
  weekly_reflection,
  questions_for_coach,
  created_at,
  updated_at
`

const RESOLUTION_FIELDS = `
  id,
  user_id,
  coaching_plan_id,
  checkin_date,
  review_date,
  resolution,
  resolved_at,
  created_at,
  updated_at
`

function daysBetween(startDate, endDate) {
  return Math.floor(
    (dateKeyToUtcMilliseconds(endDate) -
      dateKeyToUtcMilliseconds(startDate)) /
      DAY_MS,
  )
}

function dateRange(startDate, endDate) {
  if (!startDate || !endDate || startDate > endDate) {
    return []
  }

  const result = []
  let cursor = startDate

  while (cursor <= endDate) {
    result.push(cursor)
    cursor = addDays(cursor, 1)
  }

  return result
}

export function getWeeklyDueDate(
  plan,
  weekNumber,
) {
  if (
    !plan?.start_date ||
    !Number.isInteger(Number(plan?.checkin_day)) ||
    !Number.isInteger(Number(weekNumber)) ||
    Number(weekNumber) < 1
  ) {
    return null
  }

  const firstWeeklyDate =
    getFirstWeeklyCheckInDate(
      plan.start_date,
      plan.checkin_day,
    )

  return firstWeeklyDate
    ? addDays(
        firstWeeklyDate,
        (Number(weekNumber) - 1) * 7,
      )
    : null
}

export function getHistoryWeekNumber(
  plan,
  date = getTodayDateKey(),
) {
  if (!plan?.start_date || !date) {
    return null
  }

  const firstWeeklyDate =
    getFirstWeeklyCheckInDate(
      plan.start_date,
      plan.checkin_day,
    )

  if (!firstWeeklyDate) {
    return null
  }

  if (date <= firstWeeklyDate) {
    return 1
  }

  const difference = daysBetween(
    firstWeeklyDate,
    date,
  )

  return Math.ceil(difference / 7) + 1
}

export function getWeekExpectedDailyDates(
  plan,
  weekNumber,
) {
  const dueDate = getWeeklyDueDate(
    plan,
    weekNumber,
  )

  if (!dueDate) {
    return []
  }

  const dailyStart =
    Number(weekNumber) === 1
      ? addDays(plan.start_date, 1)
      : addDays(
          getWeeklyDueDate(
            plan,
            Number(weekNumber) - 1,
          ),
          1,
        )

  return dateRange(
    dailyStart,
    addDays(dueDate, -1),
  )
}

function getWeekPlanRange(plan, weekNumber) {
  const dueDate = getWeeklyDueDate(
    plan,
    weekNumber,
  )

  if (!dueDate) {
    return {
      weekStart: null,
      weekEnd: null,
    }
  }

  return {
    weekStart:
      Number(weekNumber) === 1
        ? plan.start_date
        : addDays(dueDate, -7),
    weekEnd: addDays(dueDate, -1),
  }
}

async function loadDailyRows(
  coachingPlanId,
  startDate,
  endDate,
) {
  if (!startDate || !endDate) {
    return []
  }

  const { data, error } = await supabase
    .from('daily_checkins')
    .select(DAILY_CHECKIN_FIELDS)
    .eq('coaching_plan_id', coachingPlanId)
    .gte('checkin_date', startDate)
    .lte('checkin_date', endDate)
    .order('checkin_date', {
      ascending: true,
    })

  if (error) {
    throw error
  }

  return data ?? []
}

async function loadWeeklyRows(
  coachingPlanId,
) {
  const { data, error } = await supabase
    .from('weekly_checkins')
    .select(WEEKLY_HISTORY_FIELDS)
    .eq('coaching_plan_id', coachingPlanId)
    .order('week_number', {
      ascending: true,
    })

  if (error) {
    throw error
  }

  return data ?? []
}

async function loadResolutionRows(
  coachingPlanId,
) {
  const { data, error } = await supabase
    .from('checkin_day_resolutions')
    .select(RESOLUTION_FIELDS)
    .eq('coaching_plan_id', coachingPlanId)
    .order('checkin_date', {
      ascending: true,
    })

  if (error) {
    throw error
  }

  return data ?? []
}

function buildDailyHistoryItem({
  date,
  today,
  dailyRow,
  resolution,
  weeklyDueDate,
  weeklyStatus,
}) {
  if (dailyRow) {
    return {
      type: 'daily',
      date,
      status: 'completed',
      row: dailyRow,
      canComplete: false,
    }
  }

  if (resolution?.resolution === 'unavailable') {
    return {
      type: 'daily',
      date,
      status: 'unavailable',
      row: null,
      resolution,
      canComplete: false,
    }
  }

  if (date > today) {
    return {
      type: 'daily',
      date,
      status: 'upcoming',
      row: null,
      canComplete: false,
    }
  }

  if (date === today) {
    return {
      type: 'daily',
      date,
      status: 'today',
      row: null,
      canComplete: false,
    }
  }

  return {
    type: 'daily',
    date,
    status: 'missing',
    row: null,
    canComplete: canBackfillDaily({
      dailyDate: date,
      todayDate: today,
      weeklyDueDate,
      weeklyStatus,
    }),
  }
}

function buildWeeklyHistoryItem({
  dueDate,
  today,
  weeklyRow,
  sameDateDailyRow,
}) {
  if (weeklyRow) {
    return {
      type: 'weekly',
      date: dueDate,
      status:
        weeklyRow.status === 'completed' ||
        weeklyRow.status === 'finalized'
          ? 'completed'
          : weeklyRow.status === 'submitted'
            ? 'submitted'
            : 'draft',
      row: weeklyRow,
      dailyRow: sameDateDailyRow ?? null,
    }
  }

  // Before Weekly existed, a Daily row may legitimately occupy
  // the scheduled Weekly date. Preserve and display that real data.
  if (sameDateDailyRow) {
    return {
      type: 'daily',
      date: dueDate,
      status: 'completed',
      row: sameDateDailyRow,
      legacyWeeklyDate: true,
    }
  }

  const state = getWeeklyDueState({
    weeklyDueDate: dueDate,
    todayDate: today,
  })

  if (state === WEEKLY_DUE_STATE.UPCOMING) {
    return {
      type: 'weekly',
      date: dueDate,
      status: 'upcoming',
      row: null,
    }
  }

  if (state === WEEKLY_DUE_STATE.DUE) {
    return {
      type: 'weekly',
      date: dueDate,
      status: 'due',
      row: null,
    }
  }

  if (state === WEEKLY_DUE_STATE.OVERDUE) {
    return {
      type: 'weekly',
      date: dueDate,
      status: 'overdue',
      row: null,
    }
  }

  return {
    type: 'weekly',
    date: dueDate,
    status: 'not_recorded',
    row: null,
  }
}

export async function loadCheckInHistory(
  plan,
  today = getTodayDateKey(),
) {
  if (!plan?.id || !plan?.start_date) {
    return {
      weeks: [],
      selectedWeekNumber: null,
    }
  }

  const rawCurrentWeek =
    getHistoryWeekNumber(plan, today) ?? 1

  const programLength = Number(
    plan.program_length_weeks,
  )

  const maxWeek =
    Number.isInteger(programLength) &&
    programLength > 0
      ? Math.min(rawCurrentWeek, programLength)
      : rawCurrentWeek

  const lastDueDate =
    getWeeklyDueDate(plan, maxWeek)

  const queryEnd =
    lastDueDate && lastDueDate > today
      ? lastDueDate
      : today

  const [dailyRows, weeklyRows, resolutions] =
    await Promise.all([
      loadDailyRows(
        plan.id,
        addDays(plan.start_date, 1),
        queryEnd,
      ),
      loadWeeklyRows(plan.id),
      loadResolutionRows(plan.id),
    ])

  const dailyByDate = new Map(
    dailyRows.map((row) => [
      row.checkin_date,
      row,
    ]),
  )

  const weeklyByNumber = new Map(
    weeklyRows.map((row) => [
      Number(row.week_number),
      row,
    ]),
  )

  const resolutionByDate = new Map(
    resolutions.map((row) => [
      row.checkin_date,
      row,
    ]),
  )

  const weeks = []

  for (
    let weekNumber = 1;
    weekNumber <= maxWeek;
    weekNumber += 1
  ) {
    const weeklyDueDate =
      getWeeklyDueDate(plan, weekNumber)
    const weeklyRow =
      weeklyByNumber.get(weekNumber) ?? null
    const weeklyStatus =
      weeklyRow?.status ?? null

    const dailyItems =
      getWeekExpectedDailyDates(
        plan,
        weekNumber,
      ).map((date) =>
        buildDailyHistoryItem({
          date,
          today,
          dailyRow:
            dailyByDate.get(date) ?? null,
          resolution:
            resolutionByDate.get(date) ?? null,
          weeklyDueDate,
          weeklyStatus,
        }),
      )

    const weeklyItem =
      buildWeeklyHistoryItem({
        dueDate: weeklyDueDate,
        today,
        weeklyRow,
        sameDateDailyRow:
          dailyByDate.get(weeklyDueDate) ?? null,
      })

    const planRange =
      getWeekPlanRange(plan, weekNumber)

    weeks.push({
      weekNumber,
      weeklyDueDate,
      weekStart: planRange.weekStart,
      weekEnd: planRange.weekEnd,
      items: [...dailyItems, weeklyItem],
    })
  }

  return {
    weeks,
    selectedWeekNumber:
      weeks.at(-1)?.weekNumber ?? null,
  }
}

function getExactWeeklyNumber(
  plan,
  date,
) {
  const firstWeeklyDate =
    getFirstWeeklyCheckInDate(
      plan?.start_date,
      plan?.checkin_day,
    )

  if (
    !firstWeeklyDate ||
    !date ||
    date < firstWeeklyDate
  ) {
    return null
  }

  const difference = daysBetween(
    firstWeeklyDate,
    date,
  )

  if (difference % 7 !== 0) {
    return null
  }

  return Math.floor(difference / 7) + 1
}

export async function loadWeeklyPreflight(
  plan,
  today = getTodayDateKey(),
) {
  if (!plan?.id) {
    return {
      bypass: true,
      weekNumber: null,
      unresolvedDailyDates: [],
    }
  }

  const weekNumber =
    getExactWeeklyNumber(plan, today)

  // DEV/off-schedule Weekly preview remains untouched.
  if (!weekNumber) {
    return {
      bypass: true,
      weekNumber: null,
      unresolvedDailyDates: [],
    }
  }

  const expectedDailyDates =
    getWeekExpectedDailyDates(
      plan,
      weekNumber,
    )

  const dailyStart =
    expectedDailyDates[0] ?? today
  const dailyEnd =
    expectedDailyDates.at(-1) ?? today

  const [dailyRows, weeklyResult, resolutions] =
    await Promise.all([
      loadDailyRows(
        plan.id,
        dailyStart,
        dailyEnd,
      ),
      supabase
        .from('weekly_checkins')
        .select(WEEKLY_HISTORY_FIELDS)
        .eq('coaching_plan_id', plan.id)
        .eq('week_number', weekNumber)
        .maybeSingle(),
      loadResolutionRows(plan.id),
    ])

  if (weeklyResult.error) {
    throw weeklyResult.error
  }

  const weeklyRow = weeklyResult.data ?? null

  if (
    weeklyRow?.status === 'completed' ||
    weeklyRow?.status === 'finalized' ||
    weeklyRow?.status === 'submitted'
  ) {
    return {
      bypass: true,
      weekNumber,
      weeklyRow,
      unresolvedDailyDates: [],
    }
  }

  const completedDailyDates =
    dailyRows.map((row) => row.checkin_date)
  const unavailableDailyDates =
    resolutions
      .filter(
        (row) =>
          row.resolution === 'unavailable',
      )
      .map((row) => row.checkin_date)

  const unresolvedDailyDates =
    getUnresolvedDailyDates({
      expectedDailyDates,
      completedDailyDates,
      unavailableDailyDates,
      todayDate: today,
      weeklyDueDate: today,
    })

  return {
    bypass: unresolvedDailyDates.length === 0,
    weekNumber,
    weeklyRow,
    expectedDailyDates,
    completedDailyDates,
    unavailableDailyDates,
    unresolvedDailyDates,
  }
}

export async function getCatchUpDailyEligibility(
  plan,
  checkinDate,
  today = getTodayDateKey(),
) {
  if (!plan?.id || !checkinDate) {
    return {
      allowed: false,
      reason: 'A plan and Daily Check-In date are required.',
    }
  }

  const maxWeek =
    getHistoryWeekNumber(plan, checkinDate)

  if (!maxWeek) {
    return {
      allowed: false,
      reason: 'That date is outside this coaching plan.',
    }
  }

  let matchingWeek = null

  for (
    let weekNumber = 1;
    weekNumber <= maxWeek + 1;
    weekNumber += 1
  ) {
    const expected =
      getWeekExpectedDailyDates(
        plan,
        weekNumber,
      )

    if (expected.includes(checkinDate)) {
      matchingWeek = weekNumber
      break
    }
  }

  if (!matchingWeek) {
    return {
      allowed: false,
      reason: 'That date is not a Daily Check-In date for this plan.',
    }
  }

  const weeklyDueDate =
    getWeeklyDueDate(plan, matchingWeek)

  const { data: weeklyRow, error } =
    await supabase
      .from('weekly_checkins')
      .select(WEEKLY_HISTORY_FIELDS)
      .eq('coaching_plan_id', plan.id)
      .eq('week_number', matchingWeek)
      .maybeSingle()

  if (error) {
    throw error
  }

  const existingDaily =
    await loadDailyCheckInForDate(
      plan.id,
      checkinDate,
    )

  if (existingDaily) {
    return {
      allowed: false,
      reason:
        'This Daily Check-In is already complete. Historical answers are read-only.',
      weekNumber: matchingWeek,
      weeklyDueDate,
      weeklyStatus: weeklyRow?.status ?? null,
      existingDaily,
    }
  }

  const allowed = canBackfillDaily({
    dailyDate: checkinDate,
    todayDate: today,
    weeklyDueDate,
    weeklyStatus: weeklyRow?.status ?? null,
  })

  return {
    allowed,
    reason: allowed
      ? ''
      : 'This program week is closed, so this Daily Check-In can no longer be changed.',
    weekNumber: matchingWeek,
    weeklyDueDate,
    weeklyStatus: weeklyRow?.status ?? null,
    existingDaily: null,
  }
}

export async function markDailyDataUnavailable({
  userId,
  plan,
  checkinDate,
}) {
  const eligibility =
    await getCatchUpDailyEligibility(
      plan,
      checkinDate,
    )

  if (!eligibility.allowed) {
    throw new Error(
      eligibility.reason ||
        'This Daily Check-In can no longer be resolved.',
    )
  }

  const { data, error } = await supabase
    .from('checkin_day_resolutions')
    .upsert(
      {
        user_id: userId,
        coaching_plan_id: plan.id,
        checkin_date: checkinDate,
        review_date: addDays(
          checkinDate,
          -1,
        ),
        resolution: 'unavailable',
        resolved_at:
          new Date().toISOString(),
        updated_at:
          new Date().toISOString(),
      },
      {
        onConflict:
          'coaching_plan_id,checkin_date',
      },
    )
    .select(RESOLUTION_FIELDS)
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function clearDailyDataResolution(
  coachingPlanId,
  checkinDate,
) {
  const { error } = await supabase
    .from('checkin_day_resolutions')
    .delete()
    .eq('coaching_plan_id', coachingPlanId)
    .eq('checkin_date', checkinDate)

  if (error) {
    throw error
  }
}
