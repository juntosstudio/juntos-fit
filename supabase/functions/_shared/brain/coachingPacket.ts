const DAY_MS = 86_400_000

function dateKeyToMs(dateKey: string) {
  const [year, month, day] =
    dateKey.split('-').map(Number)

  return Date.UTC(year, month - 1, day)
}

function addDays(
  dateKey: string,
  days: number,
) {
  return new Date(
    dateKeyToMs(dateKey) + days * DAY_MS,
  )
    .toISOString()
    .slice(0, 10)
}

function getWeekRange(
  planStartDate: string,
  weekNumber: number,
) {
  const weekStart = addDays(
    planStartDate,
    (weekNumber - 1) * 7,
  )

  const weekEnd = addDays(
    weekStart,
    6,
  )

  return {
    week_start: weekStart,
    week_end: weekEnd,

    // Daily questions describe the prior calendar day.
    // This mirrors Weekly Summary's current boundary logic.
    daily_start: addDays(weekStart, 1),
    daily_end: addDays(weekStart, 7),
  }
}

function finiteNumbers(
  rows: any[],
  field: string,
) {
  return rows
    .map((row) => row?.[field])
    .filter(
      (value) =>
        value !== null &&
        value !== undefined &&
        value !== '',
    )
    .map(Number)
    .filter(Number.isFinite)
}

function numericOrNull(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null
  }

  const numeric = Number(value)

  return Number.isFinite(numeric)
    ? numeric
    : null
}

function average(values: number[]) {
  if (!values.length) {
    return null
  }

  return (
    values.reduce(
      (sum, value) => sum + value,
      0,
    ) / values.length
  )
}

function round(
  value: number | null,
  digits = 1,
) {
  if (value === null || !Number.isFinite(value)) {
    return null
  }

  const factor = 10 ** digits

  return (
    Math.round(value * factor) /
    factor
  )
}

function calculateAgeYears(
  dateOfBirth: string | null,
  asOfDate: string,
) {
  if (!dateOfBirth || !asOfDate) {
    return null
  }

  const [birthYear, birthMonth, birthDay] =
    dateOfBirth.split('-').map(Number)
  const [asOfYear, asOfMonth, asOfDay] =
    asOfDate.split('-').map(Number)

  if (
    ![
      birthYear,
      birthMonth,
      birthDay,
      asOfYear,
      asOfMonth,
      asOfDay,
    ].every(Number.isInteger)
  ) {
    return null
  }

  let age = asOfYear - birthYear

  if (
    asOfMonth < birthMonth ||
    (asOfMonth === birthMonth &&
      asOfDay < birthDay)
  ) {
    age -= 1
  }

  return age >= 0 ? age : null
}

function normalizeWeeklyQuestion(
  reflection: unknown,
  question: unknown,
) {
  const reflectionText = String(
    reflection ?? '',
  ).trim()
  const questionText = String(
    question ?? '',
  ).trim()

  if (!questionText) {
    return null
  }

  // Older/current Weekly save logic can mirror the
  // reflection into questions_for_coach. Do not send
  // the same free text twice to the Brain.
  if (questionText === reflectionText) {
    return null
  }

  return questionText
}

function selectedSideMeasurement(
  weekly: any,
  rightField: string,
  leftField: string,
) {
  const side = String(
    weekly?.measurement_side ?? '',
  ).toLowerCase()

  if (side === 'left') {
    return numericOrNull(weekly?.[leftField])
  }

  if (side === 'right') {
    return numericOrNull(weekly?.[rightField])
  }

  return (
    numericOrNull(weekly?.[rightField]) ??
    numericOrNull(weekly?.[leftField])
  )
}

function deltaFromStart(
  current: unknown,
  start: unknown,
) {
  const currentValue = numericOrNull(current)
  const startValue = numericOrNull(start)

  if (currentValue === null || startValue === null) {
    return null
  }

  return round(currentValue - startValue, 2)
}

function summarizeCardioGroup(
  rows: any[],
  field: 'cardio_type' | 'cardio_intensity',
) {
  const groups = new Map<
    string,
    {
      value: string
      sessions: number
      minutes: number
    }
  >()

  for (const row of rows) {
    const minutes =
      Number(row.cardio_minutes) || 0

    if (minutes <= 0) {
      continue
    }

    const value =
      String(row?.[field] ?? '').trim() ||
      'unknown'

    const current =
      groups.get(value) ?? {
        value,
        sessions: 0,
        minutes: 0,
      }

    current.sessions += 1
    current.minutes += minutes
    groups.set(value, current)
  }

  return [...groups.values()].sort(
    (a, b) =>
      b.minutes - a.minutes,
  )
}

const NUTRITION_ADHERENCE_POLICY_VERSION =
  'meal_plan_self_report_v1'

function dailyNutritionAdherencePercent(row: any) {
  const score = Number(row?.meal_plan_score)

  if (!Number.isFinite(score)) {
    return null
  }

  const deviationDetails = String(
    row?.meal_plan_deviation_details ?? '',
  ).trim()

  const plannedCheatMealOnly =
    score >= 1 &&
    score <= 4 &&
    row?.planned_cheat_meal_status === 'eaten' &&
    !deviationDetails

  if (plannedCheatMealOnly) {
    return 100
  }

  const mapping: Record<number, number> = {
    5: 100,
    4: 95,
    3: 80,
    2: 60,
    1: 30,
  }

  return mapping[score] ?? null
}

function summarizeNutritionAdherence(rows: any[]) {
  const scores = rows
    .map(dailyNutritionAdherencePercent)
    .filter((value): value is number =>
      Number.isFinite(value),
    )

  const daysReported = scores.length
  const expectedDays = 7
  const adherencePercent = round(
    average(scores),
    0,
  )
  const coveragePercent = Math.round(
    (daysReported / expectedDays) * 100,
  )

  return {
    adherencePercent,
    daysReported,
    expectedDays,
    coveragePercent,
    dataConfidence:
      daysReported > 0 &&
      coveragePercent >= 80
        ? 'good'
        : 'limited',
  }
}

function summarizeDailyRows(
  rows: any[],
  frozenWeekly: any = null,
) {
  const mealScores = finiteNumbers(
    rows,
    'meal_plan_score',
  )
  const hungerScores = finiteNumbers(
    rows,
    'hunger_score',
  )
  const weights = finiteNumbers(
    rows,
    'morning_weight',
  )

  const cardioRows = rows.filter(
    (row) =>
      (Number(row.cardio_minutes) || 0) >
      0,
  )

  const waterTracked = rows.filter(
    (row) =>
      row.water_goal_met !== null &&
      row.water_goal_met !== undefined,
  )

  const alcoholTracked = rows.filter(
    (row) =>
      row.alcohol_consumed !== null &&
      row.alcohol_consumed !== undefined,
  )

  const calculatedNutritionAdherence =
    summarizeNutritionAdherence(rows)

  const frozenAdherence = numericOrNull(
    frozenWeekly?.nutrition_adherence_percent,
  )
  const frozenCoverage = numericOrNull(
    frozenWeekly?.nutrition_adherence_coverage_percent,
  )
  const frozenDaysReported = numericOrNull(
    frozenWeekly?.nutrition_adherence_days_reported,
  )
  const frozenExpectedDays = numericOrNull(
    frozenWeekly?.nutrition_adherence_expected_days,
  )

  const nutritionAdherence = {
    adherencePercent: frozenAdherence !== null
      ? frozenAdherence
      : calculatedNutritionAdherence.adherencePercent,
    coveragePercent: frozenCoverage !== null
      ? frozenCoverage
      : calculatedNutritionAdherence.coveragePercent,
    daysReported: frozenDaysReported !== null
      ? frozenDaysReported
      : calculatedNutritionAdherence.daysReported,
    expectedDays: frozenExpectedDays !== null
      ? frozenExpectedDays
      : calculatedNutritionAdherence.expectedDays,
    dataConfidence:
      frozenCoverage !== null
        ? frozenCoverage >= 80
          ? 'good'
          : 'limited'
        : calculatedNutritionAdherence.dataConfidence,
    policyVersion:
      frozenWeekly?.nutrition_adherence_policy_version ??
      NUTRITION_ADHERENCE_POLICY_VERSION,
  }

  return {
    days_reported:
      nutritionAdherence.daysReported,
    daily_rows_present: rows.length,
    average_weight_lbs: round(
      average(weights),
    ),
    weight_readings: weights.length,
    meal_plan_adherence_percent:
      nutritionAdherence.adherencePercent,
    meal_plan_adherence_coverage_percent:
      nutritionAdherence.coveragePercent,
    meal_plan_adherence_expected_days:
      nutritionAdherence.expectedDays,
    meal_plan_adherence_data_confidence:
      nutritionAdherence.dataConfidence,
    meal_plan_adherence_policy_version:
      nutritionAdherence.policyVersion,
    meal_score_average: round(
      average(mealScores),
      2,
    ),
    average_hunger_score: round(
      average(hungerScores),
      2,
    ),
    workouts_completed: rows.filter(
      (row) =>
        row.workout_status === 'completed',
    ).length,
    workouts_partial: rows.filter(
      (row) =>
        row.workout_status === 'partial',
    ).length,
    workouts_missed: rows.filter(
      (row) =>
        row.workout_status === 'missed',
    ).length,
    cardio_minutes: rows.reduce(
      (sum, row) =>
        sum +
        (Number(row.cardio_minutes) || 0),
      0,
    ),
    cardio_sessions:
      cardioRows.length,
    cardio_context_entries:
      cardioRows.filter(
        (row) =>
          row.cardio_type &&
          row.cardio_intensity,
      ).length,
    cardio_by_type:
      summarizeCardioGroup(
        cardioRows,
        'cardio_type',
      ),
    cardio_by_intensity:
      summarizeCardioGroup(
        cardioRows,
        'cardio_intensity',
      ),
    cardio_entries:
      cardioRows.map((row) => ({
        checkin_date:
          row.checkin_date,
        review_date:
          row.review_date,
        minutes:
          Number(row.cardio_minutes) || 0,
        type:
          row.cardio_type ?? null,
        intensity:
          row.cardio_intensity ?? null,
      })),
    water_days_tracked: waterTracked.length,
    water_goal_days: waterTracked.filter(
      (row) => row.water_goal_met === true,
    ).length,
    alcohol_days_tracked:
      alcoholTracked.length,
    alcohol_days: alcoholTracked.filter(
      (row) => row.alcohol_consumed === true,
    ).length,
    planned_cheat_meal_days: rows.filter(
      (row) =>
        row.planned_cheat_meal_status ===
        'eaten',
    ).length,
    deviation_days: rows.filter(
      (row) => {
        const score = Number(
          row.meal_plan_score,
        )

        if (
          !Number.isFinite(score) ||
          score >= 5
        ) {
          return false
        }

        const details = String(
          row.meal_plan_deviation_details ?? '',
        ).trim()

        const plannedCheatMealOnly =
          row.planned_cheat_meal_status ===
            'eaten' &&
          !details

        return !plannedCheatMealOnly
      },
    ).length,
    planned_cheat_meal_only_days:
      rows.filter((row) => {
        const score = Number(
          row.meal_plan_score,
        )
        const details = String(
          row.meal_plan_deviation_details ?? '',
        ).trim()

        return (
          Number.isFinite(score) &&
          score >= 1 &&
          score <= 4 &&
          row.planned_cheat_meal_status ===
            'eaten' &&
          !details
        )
      }).length,
    notable_daily_context: rows
      .filter(
        (row) =>
          row.meal_plan_deviation_details ||
          row.workout_incomplete_reason ||
          row.training_problem_details ||
          row.alcohol_details ||
          row.additional_notes ||
          row.questions_for_coach,
      )
      .map((row) => ({
        checkin_date: row.checkin_date,
        review_date: row.review_date,
        meal_plan_deviation_details:
          row.meal_plan_deviation_details ?? null,
        workout_incomplete_reason:
          row.workout_incomplete_reason ?? null,
        training_problem_details:
          row.training_problem_details ?? null,
        alcohol_details:
          row.alcohol_details ?? null,
        additional_notes:
          row.additional_notes ?? null,
        questions_for_coach:
          row.questions_for_coach ?? null,
      })),
  }
}

function buildPrescriptionSegments(
  targets: any[],
  weekStart: string,
  weekEnd: string,
  weekNumber: number,
) {
  if (!targets?.length) {
    return []
  }

  const activeBeforeOrAtStart = [...targets]
    .filter(
      (target) =>
        target.effective_date <= weekStart,
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
        target.effective_date > weekStart &&
        target.effective_date <= weekEnd,
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

  return relevant.map((target, index) => {
    const effectiveFrom =
      target.effective_date < weekStart
        ? weekStart
        : target.effective_date

    const next = relevant[index + 1]
    const effectiveTo = next?.effective_date
      ? addDays(next.effective_date, -1)
      : weekEnd

    const daysInEffect =
      Math.round(
        (dateKeyToMs(effectiveTo) -
          dateKeyToMs(effectiveFrom)) /
          DAY_MS,
      ) + 1

    return {
      week_number: weekNumber,
      effective_from: effectiveFrom,
      effective_to: effectiveTo,
      days_in_effect: daysInEffect,
      calorie_target:
        target.calorie_target ?? null,
      protein_grams:
        target.protein_grams ?? null,
      carb_grams: target.carb_grams ?? null,
      fat_grams: target.fat_grams ?? null,
      weekly_cardio_target_minutes:
        target.weekly_cardio_target_minutes ??
        null,
      weekly_workout_target:
        target.weekly_workout_target ?? null,
      daily_water_goal_oz:
        target.daily_water_goal_oz ?? null,
      source_target_id: target.id ?? null,
      nutrition_ownership:
        target.nutrition_ownership ??
        'juntos_managed',
      prescription_source:
        target.prescription_source ?? 'legacy',
      cardio_intensity_target:
        target.cardio_intensity_target ?? null,
    }
  })
}

async function loadDailyRows(
  admin: any,
  coachingPlanId: string,
  dailyStart: string,
  dailyEnd: string,
) {
  const { data, error } = await admin
    .from('daily_checkins')
    .select(`
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
      workout_incomplete_reason,
      training_problem,
      training_problem_details,
      cardio_minutes,
      cardio_type,
      cardio_intensity,
      alcohol_consumed,
      alcohol_details,
      additional_notes,
      questions_for_coach
    `)
    .eq('coaching_plan_id', coachingPlanId)
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

function mapSavedPrescription(row: any) {
  return {
    week_number: row.week_number,
    effective_from: row.effective_from,
    effective_to: row.effective_to,
    days_in_effect: row.days_in_effect,
    calorie_target:
      row.calorie_target ?? null,
    protein_grams:
      row.protein_grams ?? null,
    carb_grams: row.carb_grams ?? null,
    fat_grams: row.fat_grams ?? null,
    weekly_cardio_target_minutes:
      row.weekly_cardio_target_minutes ?? null,
    weekly_workout_target:
      row.weekly_workout_target ?? null,
    daily_water_goal_oz:
      row.daily_water_goal_oz ?? null,
    source_target_id:
      row.source_target_id ?? null,
    nutrition_ownership:
      row.nutrition_ownership ??
      'juntos_managed',
    prescription_source:
      row.prescription_source ?? 'legacy',
    cardio_intensity_target:
      row.cardio_intensity_target ?? null,
  }
}

function mapPrescriptionHistoryTarget(row: any) {
  return {
    id: row.id ?? null,
    effective_date: row.effective_date,
    calorie_target:
      row.calorie_target ?? null,
    protein_grams:
      row.protein_grams ?? null,
    carb_grams: row.carb_grams ?? null,
    fat_grams: row.fat_grams ?? null,
    weekly_cardio_target_minutes:
      row.weekly_cardio_target_minutes ?? 0,
    weekly_workout_target:
      row.weekly_workout_target ?? null,
    daily_water_goal_oz:
      row.daily_water_goal_oz ?? null,
    nutrition_ownership:
      row.nutrition_ownership ??
      'juntos_managed',
    prescription_source:
      row.prescription_source ?? 'legacy',
    cardio_intensity_target:
      row.cardio_intensity_target ?? null,
  }
}

export async function buildCoachingPacket({
  admin,
  weeklyCheckIn,
}: {
  admin: any
  weeklyCheckIn: any
}) {
  const weekNumber = Number(
    weeklyCheckIn.week_number,
  )

  const { data: plan, error: planError } =
    await admin
      .from('coaching_plans')
      .select(`
        id,
        user_id,
        start_date,
        checkin_day,
        program_length_weeks,
        goal,
        status,
        end_date
      `)
      .eq('id', weeklyCheckIn.coaching_plan_id)
      .single()

  if (planError) {
    throw planError
  }

  const weekRange = getWeekRange(
    plan.start_date,
    weekNumber,
  )

  const historyWeekNumbers = [
    weekNumber - 2,
    weekNumber - 1,
  ].filter((value) => value > 0)

  const historyRanges =
    historyWeekNumbers.map((historyWeek) => ({
      week_number: historyWeek,
      ...getWeekRange(
        plan.start_date,
        historyWeek,
      ),
    }))

  const earliestHistoryStart =
    historyRanges[0]?.daily_start ??
    weekRange.daily_start

  const [
    profileResult,
    settingsResult,
    startResult,
    currentDailyRows,
    targetResult,
    savedPrescriptionResult,
    previousWeeklyResult,
  ] = await Promise.all([
    admin
      .from('profiles')
      .select('id, sex, date_of_birth')
      .eq('id', plan.user_id)
      .single(),

    admin
      .from('user_settings')
      .select(`
        track_water,
        track_alcohol,
        body_fat_source,
        macro_distribution_preference
      `)
      .eq('user_id', plan.user_id)
      .maybeSingle(),

    admin
      .from('start_checkins')
      .select(`
        starting_weight_lbs,
        neck_inches,
        chest_inches,
        waist_inches,
        hips_inches,
        upper_arm_inches,
        thigh_inches,
        calf_inches,
        body_fat_percent,
        body_fat_status,
        body_fat_method,
        body_fat_formula_version,
        pre_plan_deficit_weeks,
        status,
        completed_at
      `)
      .eq('coaching_plan_id', plan.id)
      .maybeSingle(),

    loadDailyRows(
      admin,
      plan.id,
      weekRange.daily_start,
      weekRange.daily_end,
    ),

    admin
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
        daily_water_goal_oz,
        nutrition_ownership,
        prescription_source,
        cardio_intensity_target
      `)
      .eq('coaching_plan_id', plan.id)
      .lte(
        'effective_date',
        weekRange.week_end,
      )
      .order('effective_date', {
        ascending: true,
      }),

    admin
      .from('weekly_plan_prescriptions')
      .select(`
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
        daily_water_goal_oz,
        nutrition_ownership,
        prescription_source,
        cardio_intensity_target
      `)
      .eq(
        'weekly_checkin_id',
        weeklyCheckIn.id,
      )
      .order('effective_from', {
        ascending: true,
      }),

    historyWeekNumbers.length
      ? admin
          .from('weekly_checkins')
          .select(`
            id,
            week_number,
            status,
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
            measurement_side,
            body_fat_percent,
            body_fat_source,
            body_fat_method,
            sleep_quality,
            energy_level,
            recovery_score,
            stress_level,
            menstrual_cycle_context,
            weekly_reflection,
            nutrition_adherence_percent,
            nutrition_adherence_days_reported,
            nutrition_adherence_expected_days,
            nutrition_adherence_coverage_percent,
            nutrition_adherence_policy_version
          `)
          .eq('coaching_plan_id', plan.id)
          .in('week_number', historyWeekNumbers)
          .order('week_number', {
            ascending: true,
          })
      : Promise.resolve({
          data: [],
          error: null,
        }),
  ])

  if (profileResult.error) {
    throw profileResult.error
  }

  if (settingsResult.error) {
    throw settingsResult.error
  }

  if (startResult.error) {
    throw startResult.error
  }

  if (targetResult.error) {
    throw targetResult.error
  }

  if (savedPrescriptionResult.error) {
    throw savedPrescriptionResult.error
  }

  if (previousWeeklyResult.error) {
    throw previousWeeklyResult.error
  }

  const previousWeeklyRows =
    previousWeeklyResult.data ?? []
  const historicalWeeklyCheckInIds =
    previousWeeklyRows
      .map((row: any) => row?.id)
      .filter(Boolean)

  // Historical behavior and prescriptions are loaded together. When
  // a frozen Weekly prescription snapshot exists, prefer it over
  // rebuilding history from today's canonical target rows.
  const [
    historicalDailyRows,
    historicalPrescriptionResult,
  ] = await Promise.all([
    historyWeekNumbers.length
      ? loadDailyRows(
          admin,
          plan.id,
          earliestHistoryStart,
          addDays(
            weekRange.daily_start,
            -1,
          ),
        )
      : Promise.resolve([]),

    historicalWeeklyCheckInIds.length
      ? admin
          .from('weekly_plan_prescriptions')
          .select(`
            weekly_checkin_id,
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
            daily_water_goal_oz,
            nutrition_ownership,
            prescription_source,
            cardio_intensity_target
          `)
          .in(
            'weekly_checkin_id',
            historicalWeeklyCheckInIds,
          )
          .order('effective_from', {
            ascending: true,
          })
      : Promise.resolve({
          data: [],
          error: null,
        }),
  ])

  if (historicalPrescriptionResult.error) {
    throw historicalPrescriptionResult.error
  }

  const targets = targetResult.data ?? []
  const savedPrescriptions =
    savedPrescriptionResult.data ?? []

  const currentPrescriptions =
    savedPrescriptions.length
      ? savedPrescriptions.map(
          mapSavedPrescription,
        )
      : buildPrescriptionSegments(
          targets,
          weekRange.week_start,
          weekRange.week_end,
          weekNumber,
        )

  const currentBehavior =
    summarizeDailyRows(
      currentDailyRows,
      weeklyCheckIn,
    )

  const previousWeeklyMap = new Map(
    previousWeeklyRows.map(
      (row: any) => [
        Number(row.week_number),
        row,
      ],
    ),
  )

  const historicalPrescriptionMap = new Map<
    string,
    any[]
  >()

  for (const row of
    historicalPrescriptionResult.data ?? []) {
    const weeklyCheckInId = String(
      row?.weekly_checkin_id ?? '',
    )

    if (!weeklyCheckInId) {
      continue
    }

    const rows =
      historicalPrescriptionMap.get(
        weeklyCheckInId,
      ) ?? []

    rows.push(row)
    historicalPrescriptionMap.set(
      weeklyCheckInId,
      rows,
    )
  }

  const history = historyRanges.map(
    (range) => {
      const rows = historicalDailyRows.filter(
        (row: any) =>
          row.checkin_date >=
            range.daily_start &&
          row.checkin_date <=
            range.daily_end,
      )

      const weekly = previousWeeklyMap.get(
        range.week_number,
      ) as any

      const frozenPrescriptions = weekly?.id
        ? historicalPrescriptionMap.get(
            String(weekly.id),
          ) ?? []
        : []

      return {
        week_number: range.week_number,
        week_range: {
          start: range.week_start,
          end: range.week_end,
        },
        prescription: frozenPrescriptions.length
          ? frozenPrescriptions.map(
              mapSavedPrescription,
            )
          : buildPrescriptionSegments(
              targets,
              range.week_start,
              range.week_end,
              range.week_number,
            ),
        behavior: summarizeDailyRows(
          rows,
          weekly,
        ),
        weekly_context: weekly
          ? {
              status: weekly.status,
              measurement_side:
                weekly.measurement_side ?? null,
              neck_inches:
                weekly.neck ?? null,
              chest_inches:
                weekly.chest ?? null,
              waist_inches:
                weekly.waist ?? null,
              hips_inches:
                weekly.hips ?? null,
              arm_inches:
                selectedSideMeasurement(
                  weekly,
                  'right_arm',
                  'left_arm',
                ),
              thigh_inches:
                selectedSideMeasurement(
                  weekly,
                  'right_thigh',
                  'left_thigh',
                ),
              calf_inches:
                selectedSideMeasurement(
                  weekly,
                  'right_calf',
                  'left_calf',
                ),
              body_fat_percent:
                weekly.body_fat_percent ?? null,
              body_fat_source:
                weekly.body_fat_source ?? null,
              body_fat_method:
                weekly.body_fat_method ?? null,
              sleep_quality:
                weekly.sleep_quality ?? null,
              energy_level:
                weekly.energy_level ?? null,
              recovery_score:
                weekly.recovery_score ?? null,
              stress_level:
                weekly.stress_level ?? null,
              menstrual_cycle_context:
                weekly.menstrual_cycle_context ??
                null,
              weekly_reflection:
                weekly.weekly_reflection ?? null,
            }
          : null,
      }
    },
  )

  const previousBehavior =
    history.at(-1)?.behavior ?? null

  const currentAverageWeight = numericOrNull(
    currentBehavior.average_weight_lbs,
  )
  const previousAverageWeight = numericOrNull(
    previousBehavior?.average_weight_lbs,
  )
  const startWeight = numericOrNull(
    startResult.data?.starting_weight_lbs,
  )

  const weightComparison =
    previousAverageWeight !== null
      ? previousAverageWeight
      : startWeight

  const previousWeekly =
    previousWeeklyMap.get(weekNumber - 1) as any
  const currentWaist = numericOrNull(
    weeklyCheckIn.waist,
  )
  const previousWaist = numericOrNull(
    previousWeekly?.waist,
  )
  const startWaist = numericOrNull(
    startResult.data?.waist_inches,
  )

  const waistComparison =
    previousWaist !== null
      ? previousWaist
      : startWaist

  const currentArm = selectedSideMeasurement(
    weeklyCheckIn,
    'right_arm',
    'left_arm',
  )
  const currentThigh = selectedSideMeasurement(
    weeklyCheckIn,
    'right_thigh',
    'left_thigh',
  )
  const currentCalf = selectedSideMeasurement(
    weeklyCheckIn,
    'right_calf',
    'left_calf',
  )

  const currentBodyFat = numericOrNull(
    weeklyCheckIn.body_fat_percent,
  )

  return {
    packet_version: 'coaching_packet_v0.1',

    subject: {
      sex: profileResult.data?.sex ?? null,
      age_years: calculateAgeYears(
        profileResult.data?.date_of_birth ?? null,
        weekRange.week_end,
      ),
    },

    score_semantics: {
      stress_level: {
        meaning: 'stress_manageability',
        direction: 'higher_is_better_less_stress_burden',
        labels: {
          1: 'overwhelming',
          2: 'difficult',
          3: 'manageable',
          4: 'mostly_manageable',
          5: 'very_manageable',
        },
      },
      hunger_score: {
        meaning: 'hunger_severity_burden',
        direction: 'higher_is_more_hunger_burden',
        labels: {
          1: 'barely_hungry',
          2: 'comfortable',
          3: 'noticeably_hungry',
          4: 'very_hungry_or_distracting',
          5: 'extremely_hungry_or_hard_to_ignore',
        },
      },
    },

    tracking_settings: {
      source: 'current_user_settings_at_generation',
      track_water:
        settingsResult.data?.track_water !== false,
      track_alcohol:
        settingsResult.data?.track_alcohol !== false,
      body_fat_source:
        settingsResult.data?.body_fat_source ??
        'none',
      macro_distribution_preference:
        settingsResult.data
          ?.macro_distribution_preference ?? null,
    },

    plan: {
      goal: plan.goal,
      start_date: plan.start_date,
      end_date: plan.end_date,
      program_length_weeks:
        plan.program_length_weeks,
      current_week_number: weekNumber,
    },

    baseline: {
      starting_weight_lbs:
        startResult.data?.starting_weight_lbs ??
        null,
      starting_neck_inches:
        startResult.data?.neck_inches ?? null,
      starting_chest_inches:
        startResult.data?.chest_inches ?? null,
      starting_waist_inches:
        startResult.data?.waist_inches ?? null,
      starting_hips_inches:
        startResult.data?.hips_inches ?? null,
      starting_arm_inches:
        startResult.data?.upper_arm_inches ?? null,
      starting_thigh_inches:
        startResult.data?.thigh_inches ?? null,
      starting_calf_inches:
        startResult.data?.calf_inches ?? null,
      starting_body_fat_percent:
        startResult.data?.body_fat_percent ?? null,
      starting_body_fat_status:
        startResult.data?.body_fat_status ?? null,
      starting_body_fat_method:
        startResult.data?.body_fat_method ?? null,
      starting_body_fat_formula_version:
        startResult.data
          ?.body_fat_formula_version ?? null,
      pre_plan_deficit_weeks:
        startResult.data
          ?.pre_plan_deficit_weeks ?? null,
    },

    current_week: {
      week_number: weekNumber,
      week_range: {
        start: weekRange.week_start,
        end: weekRange.week_end,
      },
      prescription_source:
        savedPrescriptions.length
          ? 'weekly_snapshot'
          : 'target_history_fallback',
      prescription: currentPrescriptions,
      behavior: currentBehavior,
      outcomes: {
        weekly_average_weight_lbs:
          currentBehavior.average_weight_lbs,
        weight_change_lbs:
          currentAverageWeight !== null &&
          weightComparison !== null
            ? round(
                currentAverageWeight -
                  weightComparison,
              )
            : null,
        weight_comparison:
          previousAverageWeight !== null
            ? `week_${weekNumber - 1}_average`
            : startWeight !== null
              ? 'start_day'
              : null,
        waist_inches: currentWaist,
        waist_change_inches:
          currentWaist !== null &&
          waistComparison !== null
            ? round(
                currentWaist -
                  waistComparison,
              )
            : null,
        waist_comparison:
          previousWaist !== null
            ? `week_${weekNumber - 1}`
            : startWaist !== null
              ? 'start_day'
              : null,
        plan_start_progress: {
          weight_change_lbs: deltaFromStart(
            currentAverageWeight,
            startResult.data?.starting_weight_lbs,
          ),
          neck_change_inches: deltaFromStart(
            weeklyCheckIn.neck,
            startResult.data?.neck_inches,
          ),
          chest_change_inches: deltaFromStart(
            weeklyCheckIn.chest,
            startResult.data?.chest_inches,
          ),
          waist_change_inches: deltaFromStart(
            currentWaist,
            startResult.data?.waist_inches,
          ),
          hips_change_inches: deltaFromStart(
            weeklyCheckIn.hips,
            startResult.data?.hips_inches,
          ),
          arm_change_inches: deltaFromStart(
            currentArm,
            startResult.data?.upper_arm_inches,
          ),
          thigh_change_inches: deltaFromStart(
            currentThigh,
            startResult.data?.thigh_inches,
          ),
          calf_change_inches: deltaFromStart(
            currentCalf,
            startResult.data?.calf_inches,
          ),
          body_fat_change_points: deltaFromStart(
            currentBodyFat,
            startResult.data?.body_fat_percent,
          ),
        },
        full_measurements: {
          measurement_side:
            weeklyCheckIn.measurement_side ?? null,
          neck_inches:
            numericOrNull(weeklyCheckIn.neck),
          chest_inches:
            numericOrNull(weeklyCheckIn.chest),
          waist_inches: currentWaist,
          hips_inches:
            numericOrNull(weeklyCheckIn.hips),
          arm_inches: currentArm,
          thigh_inches: currentThigh,
          calf_inches: currentCalf,
        },
        body_fat_percent:
          weeklyCheckIn.body_fat_percent ?? null,
        body_fat_source:
          weeklyCheckIn.body_fat_source ?? null,
        body_fat_method:
          weeklyCheckIn.body_fat_method ?? null,
      },
      context: {
        sleep_quality:
          weeklyCheckIn.sleep_quality ?? null,
        energy_level:
          weeklyCheckIn.energy_level ?? null,
        recovery_score:
          weeklyCheckIn.recovery_score ?? null,
        stress_level:
          weeklyCheckIn.stress_level ?? null,
        menstrual_cycle_context:
          weeklyCheckIn
            .menstrual_cycle_context ?? null,
        weekly_reflection:
          weeklyCheckIn.weekly_reflection ?? null,
        questions_for_coach:
          normalizeWeeklyQuestion(
            weeklyCheckIn.weekly_reflection,
            weeklyCheckIn.questions_for_coach,
          ),
      },
    },

    history,

    prescription_history:
      targets.map(mapPrescriptionHistoryTarget),

    previous_coaching_decision: null,

    data_quality: {
      expected_daily_reports: 7,
      daily_reports_present:
        currentBehavior.days_reported,
      has_completed_weekly_checkin: true,
      has_prescription:
        currentPrescriptions.length > 0,
      history_weeks_included:
        historyWeekNumbers.length,
      note:
        'Earlier weeks may contain Daily-derived history without a Weekly Check-In. Missing Weekly context stays missing.',
    },
  }
}
