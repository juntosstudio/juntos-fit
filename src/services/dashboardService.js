import { supabase } from '../lib/supabase'
import { loadCheckInSettings } from './checkInSettingsService'
import {
  addDays,
  getReportingWeekForDate,
  getReportingWeekRange,
  getTodayDateKey,
  dateKeyToUtcMilliseconds,
  getWeeklyCheckInDateForWeek,
} from '../utils/dates'
import {
  getPlanProgressWeekNumber,
  getPlanWeekNumber,
} from '../utils/planProgress'
import {
  calculateProgramCheckInStreak,
} from '../utils/checkInStreak'
import {
  calculateNutritionAdherence,
} from '../utils/nutritionAdherence'
import {
  WEEKLY_DUE_STATE,
  getWeeklyDueState,
  getWeeklyGraceEndDate,
  getWeeklyGraceDaysRemaining,
} from '../utils/checkInCatchUpRules'

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
  starting_weight_lbs,
  body_fat_percent,
  neck_inches,
  chest_inches,
  waist_inches,
  hips_inches,
  upper_arm_inches,
  thigh_inches,
  calf_inches,
  completed_at,
  updated_at
`

const WEEKLY_CHECKIN_FIELDS = `
  checkin_date,
  morning_weight,
  meal_plan_score,
  meal_plan_deviation_details,
  planned_cheat_meal_status,
  water_goal_met,
  workout_status,
  cardio_minutes,
  alcohol_consumed
`

const PLAN_PROGRESS_WEEKLY_FIELDS = `
  id,
  week_number,
  checkin_date,
  status,
  submitted_at,
  nutrition_adherence_percent,
  nutrition_adherence_days_reported,
  nutrition_adherence_expected_days,
  nutrition_adherence_coverage_percent,
  nutrition_adherence_policy_version
`

const STREAK_WEEKLY_FIELDS = `
  checkin_date,
  status,
  submitted_at
`

const PLAN_PROGRESS_DAILY_FIELDS = `
  checkin_date,
  morning_weight,
  meal_plan_score,
  meal_plan_deviation_details,
  planned_cheat_meal_status,
  workout_status,
  cardio_minutes
`

const PLAN_PROGRESS_PRESCRIPTION_FIELDS = `
  weekly_checkin_id,
  week_number,
  weekly_workout_target,
  weekly_cardio_target_minutes
`

const PLAN_PROGRESS_TARGET_FIELDS = `
  id,
  effective_date,
  weekly_workout_target,
  weekly_cardio_target_minutes
`


const PLAN_PROGRESS_MEASUREMENT_FIELDS = `
  daily_checkin_id,
  week_number,
  checkin_date,
  status,
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
  navy_body_fat,
  submitted_at
`

const CONSISTENCY_WEIGHTS = {
  mealPlan: 50,
  workouts: 30,
  cardio: 20,
}

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
async function loadCurrentTarget(coachingPlanId, today) {
  const {
    data: currentTarget,
    error: currentTargetError,
  } = await supabase
    .from('coaching_plan_targets')
    .select(TARGET_FIELDS)
    .eq('coaching_plan_id', coachingPlanId)
    .lte('effective_date', today)
    .order('effective_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (currentTargetError) {
    throw currentTargetError
  }

  if (currentTarget) {
    return currentTarget
  }

  const {
    data: upcomingTarget,
    error: upcomingTargetError,
  } = await supabase
    .from('coaching_plan_targets')
    .select(TARGET_FIELDS)
    .eq('coaching_plan_id', coachingPlanId)
    .order('effective_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (upcomingTargetError) {
    throw upcomingTargetError
  }

  return upcomingTarget
}

async function loadStartCheckIn(coachingPlanId) {
  const { data: startCheckIn, error } = await supabase
    .from('start_checkins')
    .select(START_CHECKIN_FIELDS)
    .eq('coaching_plan_id', coachingPlanId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return startCheckIn
}

async function loadTodayCheckIn(coachingPlanId, today) {
  const { data: todayCheckIn, error } = await supabase
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

async function loadTodayWeeklyCheckIn(
  coachingPlanId,
  today,
) {
  if (!coachingPlanId) {
    return null
  }

  const { data: weeklyCheckIn, error } = await supabase
    .from('weekly_checkins')
    .select(
      'id, daily_checkin_id, checkin_date, week_number, status, resume_step, submitted_at',
    )
    .eq('coaching_plan_id', coachingPlanId)
    .eq('checkin_date', today)
    .maybeSingle()

  if (error) {
    throw error
  }

  return weeklyCheckIn
}

async function loadWeeklyCheckInForWeek(
  coachingPlanId,
  weekNumber,
) {
  if (!coachingPlanId || !weekNumber) {
    return null
  }

  const { data: weeklyCheckIn, error } = await supabase
    .from('weekly_checkins')
    .select(
      'id, daily_checkin_id, checkin_date, week_number, status, resume_step, submitted_at',
    )
    .eq('coaching_plan_id', coachingPlanId)
    .eq('week_number', weekNumber)
    .maybeSingle()

  if (error) {
    throw error
  }

  return weeklyCheckIn
}

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
    .order('checkin_date', { ascending: true })

  if (error) {
    throw error
  }

  return checkins ?? []
}

async function loadCheckInDates(
  coachingPlanId,
  startDate,
  today,
) {
  const { data: checkins, error } = await supabase
    .from('daily_checkins')
    .select('checkin_date, created_at')
    .eq('coaching_plan_id', coachingPlanId)
    .gte('checkin_date', startDate)
    .lte('checkin_date', today)
    .order('checkin_date', { ascending: false })

  if (error) {
    throw error
  }

  return checkins ?? []
}

async function loadCompletedWeeklyCheckInDates(
  coachingPlanId,
  startDate,
  today,
) {
  const { data: checkins, error } = await supabase
    .from('weekly_checkins')
    .select(STREAK_WEEKLY_FIELDS)
    .eq('coaching_plan_id', coachingPlanId)
    .gte('checkin_date', startDate)
    .lte('checkin_date', today)
    .order('checkin_date', { ascending: false })

  if (error) {
    throw error
  }

  const completedStatuses = new Set([
    'completed',
    'finalized',
    'submitted',
  ])

  return (checkins ?? []).filter(
    (checkin) =>
      completedStatuses.has(
        checkin.status,
      ),
  )
}

function average(values) {
  if (values.length === 0) {
    return null
  }

  return (
    values.reduce((sum, value) => sum + value, 0) /
    values.length
  )
}

function buildWeekAtAGlance(
  checkins,
  weeklyWorkoutTarget,
  expectedMealPlanDays = 7,
) {
  const nutritionAdherence =
    calculateNutritionAdherence(
      checkins,
      { expectedDays: expectedMealPlanDays },
    )

  const recordedWeights = checkins
    .map((checkin) => Number(checkin.morning_weight))
    .filter(
      (weight) => Number.isFinite(weight) && weight > 0,
    )

  const workoutsCompleted = checkins.filter(
    (checkin) => checkin.workout_status === 'completed',
  ).length

  const waterGoalDays = checkins.filter(
    (checkin) => checkin.water_goal_met === true,
  ).length

  const alcoholDays = checkins.filter(
    (checkin) => checkin.alcohol_consumed === true,
  ).length

  const cardioMinutes = checkins.reduce(
    (total, checkin) =>
      total + (Number(checkin.cardio_minutes) || 0),
    0,
  )

  return {
    mealPlanAdherencePercent:
      nutritionAdherence.adherencePercent,
    mealPlanDaysReported:
      nutritionAdherence.daysReported,
    mealPlanExpectedDays:
      nutritionAdherence.expectedDays,
    mealPlanCoveragePercent:
      nutritionAdherence.coveragePercent,
    mealPlanAdherenceBand:
      nutritionAdherence.band,
    mealPlanDataConfidence:
      nutritionAdherence.dataConfidence,
    workoutsCompleted,
    workoutsTarget: Number.isFinite(
      Number(weeklyWorkoutTarget),
    )
      ? Number(weeklyWorkoutTarget)
      : null,
    cardioMinutes,
    waterGoalDays,
    daysTracked: checkins.length > 0 ? 7 : null,
    averageWeight: average(recordedWeights),
    alcoholDays,
  }
}

function stablePrescriptionValue(prescriptions, field) {
  const values = [
    ...new Set(
      prescriptions
        .map((item) => item?.[field])
        .filter(
          (value) =>
            value !== null && value !== undefined,
        )
        .map(Number)
        .filter(Number.isFinite),
    ),
  ]

  return values.length === 1 ? values[0] : null
}

function targetsEffectiveDuringRange(targets, startDate, endDate) {
  if (!startDate || !endDate) return []

  const sorted = [...(targets ?? [])]
    .filter((target) => target?.effective_date)
    .sort((a, b) =>
      String(a.effective_date).localeCompare(String(b.effective_date)),
    )

  return sorted.filter((target, index) => {
    const nextEffectiveDate =
      sorted[index + 1]?.effective_date ?? null

    return (
      target.effective_date <= endDate &&
      (!nextEffectiveDate || nextEffectiveDate > startDate)
    )
  })
}

function cappedPercent(value, target) {
  const numericValue = Number(value)
  const numericTarget = Number(target)

  if (
    !Number.isFinite(numericValue) ||
    !Number.isFinite(numericTarget) ||
    numericTarget <= 0
  ) {
    return null
  }

  return Math.min(100, Math.max(0, (numericValue / numericTarget) * 100))
}

function calculateConsistencyScore(
  dailyRows,
  prescriptions,
  frozenNutritionAdherencePercent = null,
) {
  const components = []

  const calculatedNutritionAdherence =
    calculateNutritionAdherence(
      dailyRows,
      { expectedDays: 7 },
    )

  const hasFrozenNutritionAdherence =
    frozenNutritionAdherencePercent !== null &&
    frozenNutritionAdherencePercent !== undefined &&
    frozenNutritionAdherencePercent !== '' &&
    Number.isFinite(
      Number(frozenNutritionAdherencePercent),
    )

  const nutritionAdherencePercent =
    hasFrozenNutritionAdherence
      ? Number(frozenNutritionAdherencePercent)
      : calculatedNutritionAdherence.adherencePercent

  if (
    Number.isFinite(
      Number(nutritionAdherencePercent),
    )
  ) {
    components.push({
      score: Math.min(
        100,
        Math.max(0, Number(nutritionAdherencePercent)),
      ),
      weight: CONSISTENCY_WEIGHTS.mealPlan,
    })
  }

  const workoutTarget = stablePrescriptionValue(
    prescriptions,
    'weekly_workout_target',
  )

  if (Number.isFinite(workoutTarget) && workoutTarget > 0) {
    const workoutsCompleted = dailyRows.filter(
      (row) => row.workout_status === 'completed',
    ).length

    const workoutScore = cappedPercent(
      workoutsCompleted,
      workoutTarget,
    )

    if (workoutScore !== null) {
      components.push({
        score: workoutScore,
        weight: CONSISTENCY_WEIGHTS.workouts,
      })
    }
  }

  const cardioTarget = stablePrescriptionValue(
    prescriptions,
    'weekly_cardio_target_minutes',
  )

  if (Number.isFinite(cardioTarget) && cardioTarget > 0) {
    const cardioMinutes = dailyRows.reduce(
      (total, row) =>
        total + (Number(row.cardio_minutes) || 0),
      0,
    )

    const cardioScore = cappedPercent(
      cardioMinutes,
      cardioTarget,
    )

    if (cardioScore !== null) {
      components.push({
        score: cardioScore,
        weight: CONSISTENCY_WEIGHTS.cardio,
      })
    }
  }

  if (components.length === 0) {
    return null
  }

  const totalWeight = components.reduce(
    (total, component) => total + component.weight,
    0,
  )

  const weightedTotal = components.reduce(
    (total, component) =>
      total + component.score * component.weight,
    0,
  )

  // If a component was not prescribed or cannot be scored,
  // the remaining weights automatically re-normalize here.
  return Math.round(weightedTotal / totalWeight)
}


function selectedSideMeasurement(row, baseField, fallbackSide) {
  const side = String(
    row?.measurement_side ?? fallbackSide ?? 'right',
  ).toLowerCase()

  const field = side === 'left'
    ? `left_${baseField}`
    : `right_${baseField}`

  const value = Number(row?.[field])
  return Number.isFinite(value) ? value : null
}

async function loadPlanProgressMeasurements(plan, startCheckIn) {
  const { data, error } = await supabase
    .from('weekly_checkins')
    .select(PLAN_PROGRESS_MEASUREMENT_FIELDS)
    .eq('coaching_plan_id', plan.id)
    .eq('status', 'completed')
    .order('week_number', { ascending: true })

  if (error) {
    throw error
  }

  const weeklyRows = data ?? []
  const dailyIds = weeklyRows
    .map((row) => row.daily_checkin_id)
    .filter(Boolean)

  let weightByDailyId = new Map()

  if (dailyIds.length > 0) {
    const { data: dailyRows, error: dailyError } = await supabase
      .from('daily_checkins')
      .select('id, morning_weight')
      .in('id', dailyIds)

    if (dailyError) {
      throw dailyError
    }

    weightByDailyId = new Map(
      (dailyRows ?? []).map((row) => [
        row.id,
        Number.isFinite(Number(row.morning_weight))
          ? Number(row.morning_weight)
          : null,
      ]),
    )
  }

  const checkpoints = []

  if (startCheckIn?.status === 'completed') {
    checkpoints.push({
      checkpoint: 'Start',
      weekNumber: null,
      checkinDate: startCheckIn.checkin_date,
      weight: Number(startCheckIn.starting_weight_lbs) || null,
      bodyFat: Number(startCheckIn.body_fat_percent) || null,
      neck: Number(startCheckIn.neck_inches) || null,
      chest: Number(startCheckIn.chest_inches) || null,
      waist: Number(startCheckIn.waist_inches) || null,
      hips: Number(startCheckIn.hips_inches) || null,
      arm: Number(startCheckIn.upper_arm_inches) || null,
      thigh: Number(startCheckIn.thigh_inches) || null,
      calf: Number(startCheckIn.calf_inches) || null,
      measurementSide: plan.measurement_side ?? null,
    })
  }

  for (const row of weeklyRows) {
    const hasFullMeasurements = [
      row.neck,
      row.chest,
      row.hips,
      row.left_arm,
      row.right_arm,
      row.left_thigh,
      row.right_thigh,
      row.left_calf,
      row.right_calf,
    ].some((value) => value !== null && value !== undefined)

    if (!hasFullMeasurements) {
      continue
    }

    checkpoints.push({
      checkpoint: `Week ${row.week_number}`,
      weekNumber: Number(row.week_number),
      checkinDate: row.checkin_date,
      weight: weightByDailyId.get(row.daily_checkin_id) ?? null,
      bodyFat: Number(row.scale_body_fat ?? row.navy_body_fat) || null,
      neck: Number(row.neck) || null,
      chest: Number(row.chest) || null,
      waist: Number(row.waist) || null,
      hips: Number(row.hips) || null,
      arm: selectedSideMeasurement(row, 'arm', plan.measurement_side),
      thigh: selectedSideMeasurement(row, 'thigh', plan.measurement_side),
      calf: selectedSideMeasurement(row, 'calf', plan.measurement_side),
      measurementSide: row.measurement_side ?? plan.measurement_side ?? null,
    })
  }

  return checkpoints
}

async function loadPlanProgress(
  plan,
  currentWeekNumber,
  today,
  currentTarget = null,
) {
  if (!currentWeekNumber) {
    return []
  }

  const lastRelevantWeek =
    Math.min(
      Number(
        plan.program_length_weeks,
      ),
      currentWeekNumber,
    )

  const lastRelevantRange =
    getReportingWeekRange(
      plan.start_date,
      plan.checkin_day,
      lastRelevantWeek,
    )

  const lastDailyDate =
    lastRelevantRange?.reportingEnd ?? today

  const [
    weeklyResult,
    dailyResult,
    targetHistoryResult,
    adjustmentResult,
  ] = await Promise.all([
    supabase
      .from('weekly_checkins')
      .select(
        PLAN_PROGRESS_WEEKLY_FIELDS,
      )
      .eq(
        'coaching_plan_id',
        plan.id,
      )
      .lte(
        'week_number',
        lastRelevantWeek,
      )
      .order(
        'week_number',
        {
          ascending: true,
        },
      ),

    supabase
      .from('daily_checkins')
      .select(
        PLAN_PROGRESS_DAILY_FIELDS,
      )
      .eq(
        'coaching_plan_id',
        plan.id,
      )
      .gte(
        'checkin_date',
        addDays(
          plan.start_date,
          1,
        ),
      )
      .lte(
        'checkin_date',
        lastDailyDate,
      )
      .order(
        'checkin_date',
        {
          ascending: true,
        },
      ),

    supabase
      .from('coaching_plan_targets')
      .select(PLAN_PROGRESS_TARGET_FIELDS)
      .eq('coaching_plan_id', plan.id)
      .lte('effective_date', lastDailyDate)
      .order('effective_date', { ascending: true }),

    supabase
      .from('coaching_adjustment_proposals')
      .select('weekly_checkin_id, revision_number, status')
      .eq('coaching_plan_id', plan.id)
      .order('revision_number', { ascending: false }),
  ])

  if (weeklyResult.error) {
    throw weeklyResult.error
  }

  if (dailyResult.error) {
    throw dailyResult.error
  }

  if (targetHistoryResult.error) {
    throw targetHistoryResult.error
  }

  if (adjustmentResult.error) {
    throw adjustmentResult.error
  }

  const latestAdjustmentByWeeklyId = new Map()
  for (const proposal of adjustmentResult.data ?? []) {
    if (
      proposal?.weekly_checkin_id &&
      !latestAdjustmentByWeeklyId.has(proposal.weekly_checkin_id)
    ) {
      latestAdjustmentByWeeklyId.set(
        proposal.weekly_checkin_id,
        proposal,
      )
    }
  }

  const weeklyRows =
    weeklyResult.data ?? []
  const dailyRows =
    dailyResult.data ?? []
  const targetHistory =
    targetHistoryResult.data ?? []

  const weeklyByNumber =
    new Map(
      weeklyRows.map(
        (row) => [
          Number(
            row.week_number,
          ),
          row,
        ],
      ),
    )

  const completedIds =
    weeklyRows
      .filter(
        (row) =>
          row.status ===
          'completed',
      )
      .map(
        (row) => row.id,
      )

  let prescriptions = []

  if (completedIds.length > 0) {
    const {
      data,
      error,
    } = await supabase
      .from(
        'weekly_plan_prescriptions',
      )
      .select(
        PLAN_PROGRESS_PRESCRIPTION_FIELDS,
      )
      .in(
        'weekly_checkin_id',
        completedIds,
      )
      .order(
        'week_number',
        {
          ascending: true,
        },
      )

    if (error) {
      throw error
    }

    prescriptions = data ?? []
  }

  return Array.from(
    {
      length: lastRelevantWeek,
    },
    (_, index) => {
      const weekNumber =
        index + 1

      const weekRange =
        getReportingWeekRange(
          plan.start_date,
          plan.checkin_day,
          weekNumber,
        )

      const dailyStart =
        weekRange?.reportingStart ?? null

      const dailyEnd =
        weekRange?.reportingEnd ?? null

      const weekDailyRows =
        dailyStart && dailyEnd
          ? dailyRows.filter(
              (row) =>
                row.checkin_date >=
                  dailyStart &&
                row.checkin_date <=
                  dailyEnd,
            )
          : []

      const weekly =
        weeklyByNumber.get(
          weekNumber,
        ) ?? null

      let weekPrescriptions =
        prescriptions.filter(
          (item) =>
            Number(
              item.week_number,
            ) === weekNumber,
        )

      if (weekPrescriptions.length === 0) {
        weekPrescriptions = targetsEffectiveDuringRange(
          targetHistory,
          dailyStart,
          dailyEnd,
        )
      }

      if (
        weekPrescriptions.length === 0 &&
        weekNumber === Number(currentWeekNumber) &&
        currentTarget
      ) {
        weekPrescriptions = [currentTarget]
      }

      const recordedWeights =
        weekDailyRows
          .map(
            (row) =>
              Number(
                row.morning_weight,
              ),
          )
          .filter(
            (weight) =>
              Number.isFinite(
                weight,
              ) &&
              weight > 0,
          )

      const weeklyDueState =
        getWeeklyDueState({
          weeklyDueDate:
            weekRange?.weeklyDueDate ?? null,
          todayDate: today,
          weeklyStatus:
            weekly?.status ?? null,
        })

      return {
        weeklyCheckInId:
          weekly?.id ?? null,
        weekNumber,
        weeklyStatus:
          weekly?.status ??
          'missing',
        planAdjustmentStatus:
          weekly?.id
            ? latestAdjustmentByWeeklyId.get(weekly.id)?.status ?? null
            : null,
        weeklyDueDate:
          weekRange?.weeklyDueDate ?? null,
        weeklyDueState,
        canCompleteWeekly:
          weeklyDueState ===
          WEEKLY_DUE_STATE.OVERDUE,
        dailyCheckInCount:
          weekDailyRows.length,
        reportingStart: dailyStart,
        reportingEnd: dailyEnd,
        nutritionAdherencePercent:
          weekly?.status === 'completed' &&
          Number.isFinite(Number(weekly?.nutrition_adherence_percent))
            ? Number(weekly.nutrition_adherence_percent)
            : calculateNutritionAdherence(
                weekDailyRows,
                { expectedDays: 7 },
              ).adherencePercent,
        workoutsCompleted:
          weekDailyRows.filter(
            (row) => row.workout_status === 'completed',
          ).length,
        workoutsTarget:
          stablePrescriptionValue(
            weekPrescriptions,
            'weekly_workout_target',
          ),
        cardioMinutes:
          weekDailyRows.reduce(
            (total, row) =>
              total + (Number(row.cardio_minutes) || 0),
            0,
          ),
        cardioTarget:
          stablePrescriptionValue(
            weekPrescriptions,
            'weekly_cardio_target_minutes',
          ),
        consistencyPercent:
          weekly?.status ===
          'completed'
            ? calculateConsistencyScore(
                weekDailyRows,
                weekPrescriptions,
              )
            : null,
        averageWeight:
          average(
            recordedWeights,
          ),
        submittedAt:
          weekly?.submitted_at ??
          null,
      }
    },
  )
}


async function loadPlanWeightHistory(plan, today) {
  if (!plan?.id) {
    return []
  }

  const { data, error } = await supabase
    .from('daily_checkins')
    .select('checkin_date, morning_weight')
    .eq('coaching_plan_id', plan.id)
    .gte('checkin_date', plan.start_date)
    .lte('checkin_date', today)
    .order('checkin_date', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? [])
    .map((row) => ({
      checkinDate: row.checkin_date,
      weight: Number.isFinite(Number(row.morning_weight))
        ? Number(row.morning_weight)
        : null,
    }))
    .filter((row) => row.weight !== null && row.weight > 0)
}



async function loadAllWeightHistory(userId, today) {
  if (!userId) {
    return []
  }

  const { data: plans, error: planHistoryError } = await supabase
    .from('coaching_plans')
    .select('id, start_date')
    .eq('user_id', userId)
    .order('start_date', { ascending: true })

  if (planHistoryError) {
    throw planHistoryError
  }

  const planIds = (plans ?? []).map((row) => row.id).filter(Boolean)
  if (planIds.length === 0) {
    return []
  }

  const [dailyResult, startResult] = await Promise.all([
    supabase
      .from('daily_checkins')
      .select('coaching_plan_id, checkin_date, morning_weight')
      .in('coaching_plan_id', planIds)
      .lte('checkin_date', today)
      .order('checkin_date', { ascending: true }),
    supabase
      .from('start_checkins')
      .select('coaching_plan_id, checkin_date, starting_weight_lbs, status')
      .in('coaching_plan_id', planIds)
      .eq('status', 'completed')
      .lte('checkin_date', today)
      .order('checkin_date', { ascending: true }),
  ])

  if (dailyResult.error) {
    throw dailyResult.error
  }
  if (startResult.error) {
    throw startResult.error
  }

  const byDate = new Map()

  for (const row of startResult.data ?? []) {
    const weight = Number(row.starting_weight_lbs)
    if (!row.checkin_date || !Number.isFinite(weight) || weight <= 0) continue
    byDate.set(row.checkin_date, {
      checkinDate: row.checkin_date,
      weight,
      coachingPlanId: row.coaching_plan_id,
      source: 'start',
    })
  }

  for (const row of dailyResult.data ?? []) {
    const weight = Number(row.morning_weight)
    if (!row.checkin_date || !Number.isFinite(weight) || weight <= 0) continue
    byDate.set(row.checkin_date, {
      checkinDate: row.checkin_date,
      weight,
      coachingPlanId: row.coaching_plan_id,
      source: 'daily',
    })
  }

  return [...byDate.values()].sort((a, b) =>
    String(a.checkinDate).localeCompare(String(b.checkinDate)),
  )
}

async function loadPlanProgressPhotoMarkers(plan, startCheckIn) {
  if (!plan?.id) {
    return []
  }

  const { data: photos, error } = await supabase
    .from('progress_photos')
    .select('id, start_checkin_id, weekly_checkin_id, photo_context, pose, storage_path')
    .eq('coaching_plan_id', plan.id)

  if (error) {
    throw error
  }

  const rows = photos ?? []
  const markers = []

  async function getFrontPhotoUrl(photoRows) {
    const frontPhoto = (photoRows ?? []).find((row) =>
      String(row?.pose ?? '').toLowerCase() === 'front' && row?.storage_path,
    )

    if (!frontPhoto?.storage_path) {
      return null
    }

    const { data, error: signedUrlError } = await supabase.storage
      .from('progress-photos')
      .createSignedUrl(frontPhoto.storage_path, 60 * 60)

    if (signedUrlError) {
      debug('Could not create a progress-photo thumbnail URL.', signedUrlError)
      return null
    }

    return data?.signedUrl ?? null
  }

  if (startCheckIn?.id) {
    const startPhotoRows = rows.filter(
      (row) => row.start_checkin_id === startCheckIn.id,
    )

    if (startPhotoRows.length > 0) {
      markers.push({
        key: `start-${startCheckIn.id}`,
        label: 'Start',
        checkinDate: startCheckIn.checkin_date,
        checkpoint: 'Start',
        frontPhotoUrl: await getFrontPhotoUrl(startPhotoRows),
      })
    }
  }

  const weeklyIds = [
    ...new Set(
      rows
        .map((row) => row.weekly_checkin_id)
        .filter(Boolean),
    ),
  ]

  if (weeklyIds.length === 0) {
    return markers
  }

  const { data: weeklyRows, error: weeklyError } = await supabase
    .from('weekly_checkins')
    .select('id, week_number, checkin_date')
    .in('id', weeklyIds)
    .order('week_number', { ascending: true })

  if (weeklyError) {
    throw weeklyError
  }

  for (const row of weeklyRows ?? []) {
    const weeklyPhotoRows = rows.filter(
      (photo) => photo.weekly_checkin_id === row.id,
    )

    markers.push({
      key: `week-${row.id}`,
      label: `Week ${row.week_number}`,
      checkinDate: row.checkin_date,
      checkpoint: `Week ${row.week_number}`,
      frontPhotoUrl: await getFrontPhotoUrl(weeklyPhotoRows),
    })
  }

  return markers
}

function getElapsedReportingDays(
  reportingWeek,
  today,
) {
  const start = reportingWeek?.reportingStart
  const end = reportingWeek?.reportingEnd

  if (!start || !end || !today || today < start) {
    return 0
  }

  const cappedToday = today < end ? today : end
  const elapsed = Math.floor(
    (dateKeyToUtcMilliseconds(cappedToday) -
      dateKeyToUtcMilliseconds(start)) /
      86_400_000,
  ) + 1

  return Math.min(7, Math.max(0, elapsed))
}

// Loads all information required by the home dashboard.
export async function loadDashboardData(userId) {
  const today = getTodayDateKey()

  debug('Loading dashboard.', { userId, today })

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(
      'id, display_name, unit_system, time_zone, sex, height_cm, date_of_birth',
    )
    .eq('id', userId)
    .single()

  if (profileError) {
    throw profileError
  }

  const settings = await loadCheckInSettings(userId)

  const { data: plan, error: planError } = await supabase
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
      settings,
      plan: null,
      target: null,
      startCheckIn: null,
      todayCheckIn: null,
      todayWeeklyCheckIn: null,
      overdueWeeklyCheckIn: null,
      cardioCompleted: 0,
      cardioWeekStart: null,
      cardioWeekEnd: null,
      weekAtAGlance: null,
      reportingWeekNumber: null,
      planProgress: {
        currentWeekNumber: null,
        weeks: [],
        measurements: [],
        weightHistory: [],
        allWeightHistory: [],
        photoMarkers: [],
      },
      streakDays: 0,
    }
  }

  const reportingWeek =
    getReportingWeekForDate(
      plan.start_date,
      plan.checkin_day,
      today,
    )

  const cardioWeekStart =
    reportingWeek?.reportingStart ?? null
  const cardioWeekEnd =
    reportingWeek?.reportingEnd ?? null

  const reportingWeekNumber =
    getPlanWeekNumber(
      plan,
      today,
    )

  const previousWeekNumber =
    Number(reportingWeekNumber) > 1
      ? Number(reportingWeekNumber) - 1
      : null

  const [
    target,
    startCheckIn,
    todayCheckIn,
    todayWeeklyCheckIn,
    previousWeeklyCheckIn,
    weeklyCheckIns,
    checkInDates,
    weeklyCheckInDates,
  ] = await Promise.all([
    loadCurrentTarget(plan.id, today),
    loadStartCheckIn(plan.id),
    loadTodayCheckIn(plan.id, today),
    loadTodayWeeklyCheckIn(plan.id, today),
    previousWeekNumber
      ? loadWeeklyCheckInForWeek(
          plan.id,
          previousWeekNumber,
        )
      : Promise.resolve(null),

    today >= plan.start_date &&
    cardioWeekStart &&
    cardioWeekEnd
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
    loadCompletedWeeklyCheckInDates(
      plan.id,
      plan.start_date,
      today,
    ),
  ])

  const planProgressCurrentWeekNumber =
    getPlanProgressWeekNumber(
      plan,
      today,
      todayWeeklyCheckIn,
    )

  const planProgressWeeks =
    await loadPlanProgress(
      plan,
      planProgressCurrentWeekNumber,
      today,
      target,
    )

  const planProgressMeasurements =
    await loadPlanProgressMeasurements(
      plan,
      startCheckIn,
    )


  const [
    planProgressWeightHistory,
    allWeightHistory,
    planProgressPhotoMarkers,
  ] = await Promise.all([
    loadPlanWeightHistory(plan, today),
    loadAllWeightHistory(userId, today),
    loadPlanProgressPhotoMarkers(plan, startCheckIn),
  ])

  const weekAtAGlance = buildWeekAtAGlance(
    weeklyCheckIns,
    target?.weekly_workout_target,
    getElapsedReportingDays(
      reportingWeek,
      today,
    ),
  )

  const streakDays = calculateProgramCheckInStreak({
    dailyCheckInDates: checkInDates,
    weeklyCheckInDates,
    startCheckIn,
    planStartDate: plan.start_date,
    today,
    timeZone:
      plan.time_zone ??
      profile.time_zone ??
      undefined,
  })

  let overdueWeeklyCheckIn = null

  if (previousWeekNumber) {
    const previousWeeklyDueDate =
      getWeeklyCheckInDateForWeek(
        plan.start_date,
        plan.checkin_day,
        previousWeekNumber,
      )

    const previousWeeklyDueState =
      getWeeklyDueState({
        weeklyDueDate:
          previousWeeklyDueDate,
        todayDate: today,
        weeklyStatus:
          previousWeeklyCheckIn?.status ?? null,
      })

    if (
      previousWeeklyDueState ===
      WEEKLY_DUE_STATE.OVERDUE
    ) {
      overdueWeeklyCheckIn = {
        weekNumber: previousWeekNumber,
        checkinDate:
          previousWeeklyDueDate,
        status:
          previousWeeklyCheckIn?.status ??
          'missing',
        graceEndDate:
          getWeeklyGraceEndDate(
            previousWeeklyDueDate,
          ),
        graceDaysRemaining:
          getWeeklyGraceDaysRemaining({
            weeklyDueDate:
              previousWeeklyDueDate,
            todayDate: today,
          }),
      }
    }
  }

  const dashboard = {
    profile,
    settings,
    plan,
    target,
    startCheckIn,
    todayCheckIn,
    todayWeeklyCheckIn,
    overdueWeeklyCheckIn,
    cardioCompleted: weekAtAGlance.cardioMinutes,
    cardioWeekStart,
    cardioWeekEnd,
    weekAtAGlance,
    reportingWeekNumber,
    planProgress: {
      currentWeekNumber:
        planProgressCurrentWeekNumber,
      weeks: planProgressWeeks,
      measurements: planProgressMeasurements,
      weightHistory: planProgressWeightHistory,
      allWeightHistory,
      photoMarkers: planProgressPhotoMarkers,
    },
    streakDays,
  }

  debug('Dashboard loaded successfully.', dashboard)

  return dashboard
}
