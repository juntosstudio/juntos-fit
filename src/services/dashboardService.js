import { supabase } from '../lib/supabase'
import {
  addDays,
  getProgramWeekRange,
  getTodayDateKey,
} from '../utils/dates'

const PLAN_FIELDS = `
  id,
  user_id,
  start_date,
  checkin_day,
  program_length_weeks,
  goal,
  measurement_side,
  body_fat_source,
  time_zone,
  measurement_frequency_weeks,
  photo_frequency_weeks,
  status,
  end_date
`

const TARGET_FIELDS = `
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
`

const START_CHECKIN_FIELDS = `
  id,
  coaching_plan_id,
  checkin_date,
  status,
  completed_at,
  updated_at
`

const WEEKLY_CHECKIN_FIELDS = `
  checkin_date,
  morning_weight,
  meal_plan_score,
  water_goal_met,
  workout_status,
  cardio_minutes,
  alcohol_consumed
`

// Writes useful details to the browser console during development.
function debug(message, data = undefined) {
  if (import.meta.env.DEV) {
    console.debug(
      `[dashboardService] ${message}`,
      data ?? '',
    )
  }
}

// Returns the target active today, or the first upcoming target.
async function loadCurrentTarget(
  coachingPlanId,
  today,
) {
  const {
    data: currentTarget,
    error: currentTargetError,
  } = await supabase
    .from('coaching_plan_targets')
    .select(TARGET_FIELDS)
    .eq('coaching_plan_id', coachingPlanId)
    .lte('effective_date', today)
    .order('effective_date', {
      ascending: false,
    })
    .limit(1)
    .maybeSingle()

  if (currentTargetError) {
    throw currentTargetError
  }

  if (currentTarget) {
    return currentTarget
  }

  // Before the plan starts, show the earliest upcoming target.
  const {
    data: upcomingTarget,
    error: upcomingTargetError,
  } = await supabase
    .from('coaching_plan_targets')
    .select(TARGET_FIELDS)
    .eq('coaching_plan_id', coachingPlanId)
    .order('effective_date', {
      ascending: true,
    })
    .limit(1)
    .maybeSingle()

  if (upcomingTargetError) {
    throw upcomingTargetError
  }

  return upcomingTarget
}

// Loads the plan's draft or completed Start Check-In.
async function loadStartCheckIn(coachingPlanId) {
  const { data: startCheckIn, error } =
    await supabase
      .from('start_checkins')
      .select(START_CHECKIN_FIELDS)
      .eq('coaching_plan_id', coachingPlanId)
      .maybeSingle()

  if (error) {
    throw error
  }

  return startCheckIn
}

// Loads today's saved daily check-in, when one exists.
async function loadTodayCheckIn(
  coachingPlanId,
  today,
) {
  const { data: todayCheckIn, error } =
    await supabase
      .from('daily_checkins')
      .select('id, checkin_date')
      .eq('coaching_plan_id', coachingPlanId)
      .eq('checkin_date', today)
      .maybeSingle()

  if (error) {
    throw error
  }

  return todayCheckIn
}

// Loads the daily check-ins submitted during the current program week.
async function loadWeeklyCheckIns(
  coachingPlanId,
  weekStart,
  weekEnd,
) {
  const { data: checkins, error } = await supabase
    .from('daily_checkins')
    .select(WEEKLY_CHECKIN_FIELDS)
    .eq('coaching_plan_id', coachingPlanId)
    .gte('checkin_date', weekStart)
    .lte('checkin_date', weekEnd)
    .order('checkin_date', {
      ascending: true,
    })

  if (error) {
    throw error
  }

  return checkins ?? []
}

// Loads all check-in dates needed to calculate the current streak.
async function loadCheckInDates(
  coachingPlanId,
  startDate,
  today,
) {
  const { data: checkins, error } = await supabase
    .from('daily_checkins')
    .select('checkin_date')
    .eq('coaching_plan_id', coachingPlanId)
    .gte('checkin_date', startDate)
    .lte('checkin_date', today)
    .order('checkin_date', {
      ascending: false,
    })

  if (error) {
    throw error
  }

  return checkins ?? []
}

// Returns the average of a list of numeric values.
function average(values) {
  if (values.length === 0) {
    return null
  }

  const total = values.reduce(
    (sum, value) => sum + value,
    0,
  )

  return total / values.length
}

// Converts the current week's check-ins into dashboard totals.
function buildWeekAtAGlance(checkins, weeklyWorkoutTarget) {
  const mealPlanScores = checkins
    .map((checkin) => Number(checkin.meal_plan_score))
    .filter(Number.isFinite);

  const recordedWeights = checkins
    .map((checkin) => Number(checkin.morning_weight))
    .filter((weight) => Number.isFinite(weight) && weight > 0);

  const scheduledWorkoutStatuses = ["completed", "partial", "missed"];

  const workoutsScheduled = checkins.filter((checkin) =>
    scheduledWorkoutStatuses.includes(checkin.workout_status),
  ).length;

  const workoutsCompleted = checkins.filter(
    (checkin) => checkin.workout_status === "completed",
  ).length;

  const waterGoalDays = checkins.filter(
    (checkin) => checkin.water_goal_met === true,
  ).length;

  const alcoholDays = checkins.filter(
    (checkin) => checkin.alcohol_consumed === true,
  ).length;

  const cardioMinutes = checkins.reduce(
    (total, checkin) => total + (Number(checkin.cardio_minutes) || 0),
    0,
  );

  const averageMealPlanScore = average(mealPlanScores);

  return {
    mealPlanAdherencePercent:
      averageMealPlanScore === null ? null : averageMealPlanScore * 20,

    workoutsCompleted,

    // Until a weekly workout target is stored, this is
    // the number of scheduled workout days reported.
    workoutsTarget: Number.isFinite(Number(weeklyWorkoutTarget))
      ? Number(weeklyWorkoutTarget)
      : null,

    cardioMinutes,

    waterGoalDays,

    // Water and alcohol are weekly seven-day scores.
    daysTracked: checkins.length > 0 ? 7 : null,

    averageWeight: average(recordedWeights),

    alcoholDays,
  };
}

// Calculates consecutive daily check-ins ending today.
function calculateStreak(checkInDates, today) {
  const savedDates = new Set(
    checkInDates.map(
      (checkin) => checkin.checkin_date,
    ),
  )

  let streakDays = 0
  let currentDate = today

  while (savedDates.has(currentDate)) {
    streakDays += 1
    currentDate = addDays(currentDate, -1)
  }

  return streakDays
}

// Loads all information required by the home dashboard.
export async function loadDashboardData(userId) {
  const today = getTodayDateKey()

  debug('Loading dashboard.', {
    userId,
    today,
  })

  const { data: profile, error: profileError } =
    await supabase
      .from('profiles')
      .select('id, display_name, unit_system, time_zone')
      .eq('id', userId)
      .single()

  if (profileError) {
    throw profileError
  }

  const { data: plan, error: planError } =
    await supabase
      .from('coaching_plans')
      .select(PLAN_FIELDS)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()

  if (planError) {
    throw planError
  }

  if (!plan) {
    debug('No active coaching plan found.')

    return {
      profile,
      plan: null,
      target: null,
      startCheckIn: null,
      todayCheckIn: null,
      cardioCompleted: 0,
      cardioWeekStart: null,
      cardioWeekEnd: null,
      weekAtAGlance: null,
      streakDays: 0,
    }
  }

  const {
    weekStart: cardioWeekStart,
    weekEnd: cardioWeekEnd,
  } = getProgramWeekRange(
    plan.start_date,
    today,
  )

  const [
    target,
    startCheckIn,
    todayCheckIn,
    weeklyCheckIns,
    checkInDates,
  ] = await Promise.all([
    loadCurrentTarget(plan.id, today),

    loadStartCheckIn(plan.id),

    loadTodayCheckIn(plan.id, today),

    today >= plan.start_date
      ? loadWeeklyCheckIns(
          plan.id,
          cardioWeekStart,
          cardioWeekEnd,
        )
      : Promise.resolve([]),

    loadCheckInDates(
      plan.id,
      plan.start_date,
      today,
    ),
  ])

 const weekAtAGlance = buildWeekAtAGlance(
   weeklyCheckIns,
   target?.weekly_workout_target,
 );

  const streakDays = calculateStreak(
    checkInDates,
    today,
  )

  const dashboard = {
    profile,
    plan,
    target,
    startCheckIn,
    todayCheckIn,

    cardioCompleted:
      weekAtAGlance.cardioMinutes,

    cardioWeekStart,
    cardioWeekEnd,
    weekAtAGlance,
    streakDays,
  }

  debug(
    'Dashboard loaded successfully.',
    dashboard,
  )

  return dashboard
}