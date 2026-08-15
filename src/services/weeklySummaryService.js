import { supabase } from '../lib/supabase'
import {
  addDays,
} from '../utils/dates'

const COMPLETED_WEEK_FIELDS = `
  id,
  coaching_plan_id,
  checkin_date,
  week_number,
  status,
  submitted_at
`

const WEEKLY_SUMMARY_FIELDS = `
  id,
  coaching_plan_id,
  checkin_date,
  week_number,
  status,
  submitted_at,
  waist,
  body_fat_percent,
  body_fat_source,
  body_fat_method,
  sleep_quality,
  energy_level,
  recovery_score,
  stress_level,
  menstrual_cycle_context,
  weekly_reflection
`

const DAILY_SUMMARY_FIELDS = `
  id,
  checkin_date,
  review_date,
  morning_weight,
  weight_status,
  meal_plan_score,
  meal_plan_deviation_details,
  planned_cheat_meal_status,
  hunger_score,
  water_goal_met,
  workout_status,
  cardio_minutes,
  alcohol_consumed
`

const PRESCRIPTION_FIELDS = `
  id,
  weekly_checkin_id,
  coaching_plan_id,
  source_target_id,
  week_number,
  effective_from,
  effective_to,
  days_in_effect,
  calorie_target,
  protein_grams,
  carb_grams,
  fat_grams,
  weekly_cardio_target_minutes,
  weekly_workout_target,
  daily_water_goal_oz
`

function getWeekRange(
  planStartDate,
  weekNumber,
) {
  const weekStart = addDays(
    planStartDate,
    (Number(weekNumber) - 1) * 7,
  )

  return {
    weekStart,
    weekEnd: addDays(
      weekStart,
      6,
    ),

    // Daily Check-In questions describe yesterday.
    // A program week of Sun-Sat therefore lives in
    // Daily rows submitted Mon-Sun.
    dailyStart: addDays(
      weekStart,
      1,
    ),
    dailyEnd: addDays(
      weekStart,
      7,
    ),
  }
}

async function loadDailyRows(
  coachingPlanId,
  dailyStart,
  dailyEnd,
) {
  const { data, error } =
    await supabase
      .from('daily_checkins')
      .select(DAILY_SUMMARY_FIELDS)
      .eq(
        'coaching_plan_id',
        coachingPlanId,
      )
      .gte('checkin_date', dailyStart)
      .lte('checkin_date', dailyEnd)
      .order('checkin_date', {
        ascending: true,
      })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function
loadCompletedWeeklyCheckIns(
  coachingPlanId,
) {
  if (!coachingPlanId) {
    return []
  }

  const { data, error } =
    await supabase
      .from('weekly_checkins')
      .select(COMPLETED_WEEK_FIELDS)
      .eq(
        'coaching_plan_id',
        coachingPlanId,
      )
      .eq('status', 'completed')
      .order('week_number', {
        ascending: false,
      })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function loadWeeklySummary(
  plan,
  weekNumber,
) {
  if (
    !plan?.id ||
    !plan?.start_date ||
    !weekNumber
  ) {
    return null
  }

  const weekRange =
    getWeekRange(
      plan.start_date,
      weekNumber,
    )

  const previousWeekRange =
    Number(weekNumber) > 1
      ? getWeekRange(
          plan.start_date,
          Number(weekNumber) - 1,
        )
      : null

  const [
    weeklyResult,
    dailyRows,
    previousDailyRows,
    previousWeeklyResult,
    startResult,
  ] = await Promise.all([
    supabase
      .from('weekly_checkins')
      .select(WEEKLY_SUMMARY_FIELDS)
      .eq(
        'coaching_plan_id',
        plan.id,
      )
      .eq(
        'week_number',
        weekNumber,
      )
      .eq('status', 'completed')
      .maybeSingle(),

    loadDailyRows(
      plan.id,
      weekRange.dailyStart,
      weekRange.dailyEnd,
    ),

    previousWeekRange
      ? loadDailyRows(
          plan.id,
          previousWeekRange.dailyStart,
          previousWeekRange.dailyEnd,
        )
      : Promise.resolve([]),

    Number(weekNumber) > 1
      ? supabase
          .from('weekly_checkins')
          .select(
            'id, week_number, waist, body_fat_percent, body_fat_source, body_fat_method',
          )
          .eq(
            'coaching_plan_id',
            plan.id,
          )
          .eq(
            'week_number',
            Number(weekNumber) - 1,
          )
          .eq('status', 'completed')
          .maybeSingle()
      : Promise.resolve({
          data: null,
          error: null,
        }),

    supabase
      .from('start_checkins')
      .select(
        'starting_weight_lbs, waist_inches, status',
      )
      .eq(
        'coaching_plan_id',
        plan.id,
      )
      .maybeSingle(),
  ])

  if (weeklyResult.error) {
    throw weeklyResult.error
  }

  if (previousWeeklyResult.error) {
    throw previousWeeklyResult.error
  }

  if (startResult.error) {
    throw startResult.error
  }

  if (!weeklyResult.data) {
    return null
  }

  const {
    data: prescriptions,
    error: prescriptionError,
  } = await supabase
    .from('weekly_plan_prescriptions')
    .select(PRESCRIPTION_FIELDS)
    .eq(
      'weekly_checkin_id',
      weeklyResult.data.id,
    )
    .order('effective_from', {
      ascending: true,
    })

  if (prescriptionError) {
    throw prescriptionError
  }

  return {
    week: weeklyResult.data,
    weekRange,
    dailyRows,
    previousDailyRows,
    previousWeek:
      previousWeeklyResult.data,
    startCheckIn:
      startResult.data,
    prescriptions:
      prescriptions ?? [],
  }
}


function buildPrescriptionSegments(
  targets,
  weekStart,
  weekEnd,
  weekNumber,
) {
  if (!targets?.length) {
    return []
  }

  const activeBeforeOrAtStart = [...targets]
    .filter(
      (target) =>
        target.effective_date <=
        weekStart,
    )
    .sort((a, b) =>
      a.effective_date.localeCompare(
        b.effective_date,
      ),
    )
    .at(-1)

  const duringWeek = targets
    .filter(
      (target) =>
        target.effective_date >
          weekStart &&
        target.effective_date <=
          weekEnd,
    )
    .sort((a, b) =>
      a.effective_date.localeCompare(
        b.effective_date,
      ),
    )

  const relevant = [
    ...(activeBeforeOrAtStart
      ? [activeBeforeOrAtStart]
      : []),
    ...duringWeek,
  ]

  return relevant.map(
    (target, index) => {
      const effectiveFrom =
        target.effective_date <
        weekStart
          ? weekStart
          : target.effective_date

      const next =
        relevant[index + 1]

      const effectiveTo =
        next?.effective_date
          ? addDays(
              next.effective_date,
              -1,
            )
          : weekEnd

      const daysInEffect =
        Math.round(
          (Date.parse(
            `${effectiveTo}T00:00:00Z`,
          ) -
            Date.parse(
              `${effectiveFrom}T00:00:00Z`,
            )) /
            86400000,
        ) + 1

      return {
        id: `dev-${target.id}-${effectiveFrom}`,
        weekly_checkin_id: null,
        coaching_plan_id:
          target.coaching_plan_id,
        source_target_id: target.id,
        week_number: weekNumber,
        effective_from: effectiveFrom,
        effective_to: effectiveTo,
        days_in_effect: daysInEffect,
        calorie_target:
          target.calorie_target,
        protein_grams:
          target.protein_grams,
        carb_grams:
          target.carb_grams,
        fat_grams:
          target.fat_grams,
        weekly_cardio_target_minutes:
          target
            .weekly_cardio_target_minutes,
        weekly_workout_target:
          target.weekly_workout_target,
        daily_water_goal_oz:
          target.daily_water_goal_oz,
      }
    },
  )
}

export async function
loadWeeklySummaryPreview(
  plan,
  weekNumber,
) {
  if (
    !import.meta.env.DEV ||
    !plan?.id ||
    !plan?.start_date ||
    !weekNumber
  ) {
    return null
  }

  const weekRange =
    getWeekRange(
      plan.start_date,
      weekNumber,
    )

  const previousWeekRange =
    Number(weekNumber) > 1
      ? getWeekRange(
          plan.start_date,
          Number(weekNumber) - 1,
        )
      : null

  const [
    dailyRows,
    previousDailyRows,
    startResult,
    targetResult,
  ] = await Promise.all([
    loadDailyRows(
      plan.id,
      weekRange.dailyStart,
      weekRange.dailyEnd,
    ),

    previousWeekRange
      ? loadDailyRows(
          plan.id,
          previousWeekRange.dailyStart,
          previousWeekRange.dailyEnd,
        )
      : Promise.resolve([]),

    supabase
      .from('start_checkins')
      .select(
        'starting_weight_lbs, waist_inches, status',
      )
      .eq(
        'coaching_plan_id',
        plan.id,
      )
      .maybeSingle(),

    supabase
      .from('coaching_plan_targets')
      .select(`
        id,
        coaching_plan_id,
        effective_date,
        calorie_target,
        protein_grams,
        carb_grams,
        fat_grams,
        weekly_cardio_target_minutes,
        weekly_workout_target,
        daily_water_goal_oz
      `)
      .eq(
        'coaching_plan_id',
        plan.id,
      )
      .lte(
        'effective_date',
        weekRange.weekEnd,
      )
      .order('effective_date', {
        ascending: true,
      }),
  ])

  if (startResult.error) {
    throw startResult.error
  }

  if (targetResult.error) {
    throw targetResult.error
  }

  const prescriptions =
    buildPrescriptionSegments(
      targetResult.data ?? [],
      weekRange.weekStart,
      weekRange.weekEnd,
      Number(weekNumber),
    )

  return {
    preview: true,

    week: {
      id: 'dev-preview',
      coaching_plan_id: plan.id,
      checkin_date: addDays(
        weekRange.weekEnd,
        1,
      ),
      week_number:
        Number(weekNumber),
      status: 'preview',
      submitted_at: null,

      // Weekly-only answers do not exist until a
      // real Weekly Check-In is submitted.
      waist: null,
      body_fat_percent: null,
      body_fat_source: 'none',
      body_fat_method: null,
      sleep_quality: null,
      energy_level: null,
      recovery_score: null,
      stress_level: null,
      menstrual_cycle_context: null,
      weekly_reflection: null,
    },

    weekRange,
    dailyRows,
    previousDailyRows,
    previousWeek: null,
    startCheckIn:
      startResult.data,
    prescriptions,
  }
}
