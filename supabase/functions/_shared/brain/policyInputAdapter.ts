import { POLICY_DEFAULTS } from './policyConfig.ts'
import type {
  CoachingGoal,
  DeterministicPolicyInput,
  MacroDistributionPreference,
  NutritionOwnership,
  PolicyPrescription,
  PolicyWeekEvidence,
} from './policyTypes.ts'

function finiteOrNull(value: unknown) {
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

function integerOrZero(value: unknown) {
  const numeric = finiteOrNull(value)

  return numeric === null
    ? 0
    : Math.max(0, Math.trunc(numeric))
}

function normalizeGoal(value: unknown): CoachingGoal {
  if (value === 'fat_loss') {
    return 'fat_loss'
  }

  if (value === 'muscle_gain') {
    return 'muscle_gain'
  }

  // Unknown/corrupt goals fail closed through the unsupported
  // maintenance policy rather than accidentally enabling fat-loss
  // adjustments. Database constraints should make this rare.
  return 'maintenance'
}

function normalizeMacroPreference(
  value: unknown,
): MacroDistributionPreference {
  if (
    value === 'higher_carb' ||
    value === 'lower_carb'
  ) {
    return value
  }

  return POLICY_DEFAULTS.macroDistributionPreference
}

function normalizeNutritionOwnership(
  value: unknown,
): NutritionOwnership {
  return value === 'self_managed'
    ? 'self_managed'
    : 'juntos_managed'
}

function normalizeCardioIntensity(value: unknown) {
  if (
    value === 'easy' ||
    value === 'moderate' ||
    value === 'hard'
  ) {
    return value
  }

  return null
}

function normalizeBodyFatSource(value: unknown) {
  if (
    value === 'scale' ||
    value === 'juntos_estimate' ||
    value === 'none'
  ) {
    return value
  }

  return null
}

function sortPrescriptionSegments(segments: any[]) {
  return [...(segments ?? [])].sort(
    (a, b) =>
      String(a?.effective_from ?? '').localeCompare(
        String(b?.effective_from ?? ''),
      ),
  )
}

function activePrescriptionSegment(packet: any) {
  return sortPrescriptionSegments(
    packet?.current_week?.prescription ?? [],
  ).at(-1) ?? null
}

function toPolicyPrescription(segment: any): PolicyPrescription {
  return {
    calorie_target: finiteOrNull(
      segment?.calorie_target,
    ),
    protein_grams: finiteOrNull(
      segment?.protein_grams,
    ),
    carb_grams: finiteOrNull(
      segment?.carb_grams,
    ),
    fat_grams: finiteOrNull(
      segment?.fat_grams,
    ),
    weekly_cardio_target_minutes:
      integerOrZero(
        segment?.weekly_cardio_target_minutes,
      ),
    cardio_intensity_target:
      normalizeCardioIntensity(
        segment?.cardio_intensity_target,
      ),
    weekly_workout_target: finiteOrNull(
      segment?.weekly_workout_target,
    ),
    daily_water_goal_oz: finiteOrNull(
      segment?.daily_water_goal_oz,
    ),
    nutrition_ownership:
      normalizeNutritionOwnership(
        segment?.nutrition_ownership,
      ),
  }
}

function toWeekEvidence(week: any): PolicyWeekEvidence {
  const behavior = week?.behavior ?? {}
  const outcomes = week?.outcomes ?? {}
  const context =
    week?.context ?? week?.weekly_context ?? {}

  return {
    week_number:
      integerOrZero(week?.week_number),
    average_weight_lbs: finiteOrNull(
      behavior?.average_weight_lbs ??
        outcomes?.weekly_average_weight_lbs,
    ),
    weight_readings: integerOrZero(
      behavior?.weight_readings,
    ),
    nutrition_adherence_percent:
      finiteOrNull(
        behavior?.meal_plan_adherence_percent,
      ),
    nutrition_coverage_percent:
      finiteOrNull(
        behavior
          ?.meal_plan_adherence_coverage_percent,
      ),
    waist_inches: finiteOrNull(
      outcomes?.waist_inches ??
        context?.waist_inches,
    ),
    body_fat_percent: finiteOrNull(
      outcomes?.body_fat_percent ??
        context?.body_fat_percent,
    ),
    body_fat_source: normalizeBodyFatSource(
      outcomes?.body_fat_source ??
        context?.body_fat_source,
    ),
    average_hunger_score: finiteOrNull(
      behavior?.average_hunger_score,
    ),
    sleep_quality: finiteOrNull(
      context?.sleep_quality,
    ),
    energy_level: finiteOrNull(
      context?.energy_level,
    ),
    recovery_score: finiteOrNull(
      context?.recovery_score,
    ),
    stress_level: finiteOrNull(
      context?.stress_level,
    ),
    cardio_minutes: integerOrZero(
      behavior?.cardio_minutes,
    ),
  }
}

function materialPrescriptionKey(segment: any) {
  if (!segment) {
    return null
  }

  // Observation clocks reset on a material prescription change,
  // not merely because a new immutable target row was inserted.
  // Compare the actual prescription values; source_target_id remains
  // traceability metadata rather than policy semantics.
  return JSON.stringify({
    calorie_target:
      finiteOrNull(segment?.calorie_target),
    protein_grams:
      finiteOrNull(segment?.protein_grams),
    carb_grams:
      finiteOrNull(segment?.carb_grams),
    fat_grams:
      finiteOrNull(segment?.fat_grams),
    weekly_cardio_target_minutes:
      integerOrZero(
        segment?.weekly_cardio_target_minutes,
      ),
    weekly_workout_target:
      finiteOrNull(segment?.weekly_workout_target),
    daily_water_goal_oz:
      finiteOrNull(segment?.daily_water_goal_oz),
    nutrition_ownership:
      normalizeNutritionOwnership(
        segment?.nutrition_ownership,
      ),
    cardio_intensity_target:
      normalizeCardioIntensity(
        segment?.cardio_intensity_target,
      ),
  })
}

function fullWeeksUnderCurrentPrescription(packet: any) {
  const currentWeek = packet?.current_week
  const currentSegments = sortPrescriptionSegments(
    currentWeek?.prescription ?? [],
  )

  if (currentSegments.length !== 1) {
    return 0
  }

  const activeKey = materialPrescriptionKey(
    currentSegments[0],
  )

  if (!activeKey) {
    return 0
  }

  const weeks = [
    ...(packet?.history ?? []),
    currentWeek,
  ]
    .filter(Boolean)
    .sort(
      (a, b) =>
        Number(b?.week_number ?? 0) -
        Number(a?.week_number ?? 0),
    )

  let expectedWeek = integerOrZero(
    currentWeek?.week_number,
  )
  let count = 0

  for (const week of weeks) {
    const weekNumber = integerOrZero(
      week?.week_number,
    )

    if (weekNumber !== expectedWeek) {
      break
    }

    const segments = sortPrescriptionSegments(
      week?.prescription ?? [],
    )

    const fullWeek =
      segments.length === 1 &&
      integerOrZero(segments[0]?.days_in_effect) === 7

    if (
      !fullWeek ||
      materialPrescriptionKey(segments[0]) !== activeKey
    ) {
      break
    }

    count += 1
    expectedWeek -= 1
  }

  return count
}

function countPriorCalorieReductions(packet: any) {
  const history = [
    ...(packet?.prescription_history ?? []),
  ].sort((a, b) =>
    String(a?.effective_date ?? '').localeCompare(
      String(b?.effective_date ?? ''),
    ),
  )

  let reductions = 0

  for (let index = 1; index < history.length; index += 1) {
    const previous = finiteOrNull(
      history[index - 1]?.calorie_target,
    )
    const current = finiteOrNull(
      history[index]?.calorie_target,
    )

    if (
      previous !== null &&
      current !== null &&
      current < previous
    ) {
      reductions += 1
    }
  }

  return reductions
}

function continuousDeficitWeeks(
  packet: any,
  goal: CoachingGoal,
) {
  if (goal !== 'fat_loss') {
    return null
  }

  const completedPlanWeeks = integerOrZero(
    packet?.current_week?.week_number,
  )
  const prePlan = finiteOrNull(
    packet?.baseline?.pre_plan_deficit_weeks,
  )

  // A completed fat-loss plan week is known deficit exposure.
  // Unknown pre-plan history contributes zero rather than making
  // known in-plan deficit time disappear.
  return (
    completedPlanWeeks +
    Math.max(0, Math.trunc(prePlan ?? 0))
  )
}

export function buildDeterministicPolicyInput(
  packet: any,
): DeterministicPolicyInput {
  const goal = normalizeGoal(packet?.plan?.goal)
  const completedWeekNumber = integerOrZero(
    packet?.current_week?.week_number ??
      packet?.plan?.current_week_number,
  )
  const activeSegment = activePrescriptionSegment(
    packet,
  )

  const currentWeek = toWeekEvidence(
    packet?.current_week ?? {},
  )

  const historyEvidence = [
    ...(packet?.history ?? []),
  ]
    .map(toWeekEvidence)
    .filter(
      (week) =>
        week.week_number > 0 &&
        week.week_number < completedWeekNumber,
    )
    .sort(
      (a, b) =>
        a.week_number - b.week_number,
    )

  const previousWeek =
    historyEvidence.find(
      (week) =>
        week.week_number ===
        completedWeekNumber - 1,
    ) ?? null

  return {
    completed_week_number: completedWeekNumber,
    goal,
    target_loss_rate_pct_per_week:
      goal === 'fat_loss'
        ? POLICY_DEFAULTS.fatLossTargetRatePctPerWeek
        : null,
    macro_distribution_preference:
      normalizeMacroPreference(
        packet?.tracking_settings
          ?.macro_distribution_preference,
      ),
    current_prescription:
      toPolicyPrescription(activeSegment),
    current_week: currentWeek,
    previous_week: previousWeek,
    recent_weeks: [
      ...historyEvidence,
      currentWeek,
    ]
      .filter((week) => week.week_number > 0)
      .sort(
        (a, b) =>
          a.week_number - b.week_number,
      )
      .slice(-3),
    history: {
      full_weeks_under_current_prescription:
        fullWeeksUnderCurrentPrescription(packet),
      continuous_deficit_weeks:
        continuousDeficitWeeks(packet, goal),
      prior_calorie_reductions:
        countPriorCalorieReductions(packet),
    },
    minimum_fat_grams: null,
  }
}
