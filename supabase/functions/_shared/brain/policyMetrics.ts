import { POLICY_THRESHOLDS } from './policyConfig.ts'
import type {
  DeterministicPolicyInput,
  PolicyDataConfidence,
  PolicySignals,
  PolicyWeekEvidence,
  WeightPaceMetrics,
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

function round(
  value: number | null,
  digits = 2,
) {
  if (value === null) {
    return null
  }

  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function calculateWeightPace(
  currentWeek: PolicyWeekEvidence,
  previousWeek: PolicyWeekEvidence | null,
  targetLossRatePctPerWeek: number | null,
): WeightPaceMetrics {
  const currentWeight = finiteOrNull(
    currentWeek.average_weight_lbs,
  )
  const previousWeight = finiteOrNull(
    previousWeek?.average_weight_lbs,
  )
  const targetRate = finiteOrNull(
    targetLossRatePctPerWeek,
  )

  if (
    currentWeight === null ||
    previousWeight === null
  ) {
    return {
      weekly_change_lbs: null,
      actual_loss_lbs: null,
      target_loss_lbs: null,
      pace_percent_of_target: null,
    }
  }

  const weeklyChange = currentWeight - previousWeight
  const actualLoss = previousWeight - currentWeight

  if (targetRate === null || targetRate <= 0) {
    return {
      weekly_change_lbs: round(weeklyChange),
      actual_loss_lbs: round(actualLoss),
      target_loss_lbs: null,
      pace_percent_of_target: null,
    }
  }

  const targetLoss =
    previousWeight * (targetRate / 100)

  return {
    weekly_change_lbs: round(weeklyChange),
    actual_loss_lbs: round(actualLoss),
    target_loss_lbs: round(targetLoss),
    pace_percent_of_target: round(
      (actualLoss / targetLoss) * 100,
      1,
    ),
  }
}

export function calculateDataConfidence(
  input: DeterministicPolicyInput,
): PolicyDataConfidence {
  const current = input.current_week
  const previous = input.previous_week

  const adherence = finiteOrNull(
    current.nutrition_adherence_percent,
  )
  const coverage = finiteOrNull(
    current.nutrition_coverage_percent,
  )

  const currentWeightGood =
    current.weight_readings >=
    POLICY_THRESHOLDS.weightReadingsMinimum
  const previousWeightGood =
    previous !== null &&
    previous.weight_readings >=
      POLICY_THRESHOLDS.weightReadingsMinimum

  if (
    adherence !== null &&
    adherence >=
      POLICY_THRESHOLDS.nutritionAdherenceStrong &&
    coverage !== null &&
    coverage >=
      POLICY_THRESHOLDS.nutritionCoverageMinimum &&
    currentWeightGood &&
    previousWeightGood
  ) {
    return 'high'
  }

  if (
    adherence !== null &&
    adherence >=
      POLICY_THRESHOLDS.nutritionAdherenceUsable &&
    coverage !== null &&
    coverage >=
      POLICY_THRESHOLDS.nutritionCoverageMinimum &&
    current.weight_readings >= 4 &&
    previous !== null &&
    previous.weight_readings >= 4
  ) {
    return 'medium'
  }

  return 'low'
}

export function hasRecoveryConcern(
  week: PolicyWeekEvidence,
) {
  const lowSignals = [
    week.sleep_quality,
    week.energy_level,
    week.recovery_score,
  ].filter((value) => {
    const numeric = finiteOrNull(value)
    return (
      numeric !== null &&
      numeric <=
        POLICY_THRESHOLDS.lowRecoveryScore
    )
  }).length

  const stress = finiteOrNull(
    week.stress_level,
  )

  return (
    lowSignals >= 2 ||
    (
      lowSignals >= 1 &&
      stress !== null &&
      stress >=
        POLICY_THRESHOLDS.highStressScore
    )
  )
}

export function hasDietFatigue(
  week: PolicyWeekEvidence,
) {
  const hunger = finiteOrNull(
    week.average_hunger_score,
  )

  if (
    hunger !== null &&
    hunger >= POLICY_THRESHOLDS.highHungerScore
  ) {
    return true
  }

  return hasRecoveryConcern(week)
}

export function calculateWaistChange(
  currentWeek: PolicyWeekEvidence,
  previousWeek: PolicyWeekEvidence | null,
) {
  const current = finiteOrNull(
    currentWeek.waist_inches,
  )
  const previous = finiteOrNull(
    previousWeek?.waist_inches,
  )

  if (current === null || previous === null) {
    return null
  }

  return round(current - previous, 2)
}

export function calculateBodyFatChange(
  currentWeek: PolicyWeekEvidence,
  previousWeek: PolicyWeekEvidence | null,
) {
  const current = finiteOrNull(
    currentWeek.body_fat_percent,
  )
  const previous = finiteOrNull(
    previousWeek?.body_fat_percent,
  )

  if (current === null || previous === null) {
    return null
  }

  return round(current - previous, 2)
}

export function calculateCardioCompletion(
  week: PolicyWeekEvidence,
  targetMinutes: number,
) {
  if (!Number.isFinite(targetMinutes) || targetMinutes <= 0) {
    return null
  }

  return round(
    (Math.max(0, week.cardio_minutes) /
      targetMinutes) * 100,
    0,
  )
}

export function isCardioAddressed({
  targetMinutes,
  intensity,
  recoveryConcern,
}: {
  targetMinutes: number
  intensity: string | null
  recoveryConcern: boolean
}) {
  if (
    targetMinutes >
    POLICY_THRESHOLDS.cardioMinutesMaximum
  ) {
    return true
  }

  if (
    targetMinutes <
    POLICY_THRESHOLDS.cardioMinutesMaximum
  ) {
    return false
  }

  return (
    intensity === 'moderate' ||
    intensity === 'hard' ||
    recoveryConcern
  )
}

export function derivePolicySignals(
  input: DeterministicPolicyInput,
): PolicySignals {
  const weightPace = calculateWeightPace(
    input.current_week,
    input.previous_week,
    input.target_loss_rate_pct_per_week,
  )

  const waistChange = calculateWaistChange(
    input.current_week,
    input.previous_week,
  )

  const bodyFatChange = calculateBodyFatChange(
    input.current_week,
    input.previous_week,
  )

  const recoveryConcern = hasRecoveryConcern(
    input.current_week,
  )
  const dietFatigue = hasDietFatigue(
    input.current_week,
  )

  const cardioCompletion =
    calculateCardioCompletion(
      input.current_week,
      input.current_prescription
        .weekly_cardio_target_minutes,
    )

  return {
    data_confidence:
      calculateDataConfidence(input),
    weight_pace: weightPace,
    waist_change_inches: waistChange,
    meaningful_waist_progress:
      waistChange !== null &&
      waistChange <=
        -POLICY_THRESHOLDS.meaningfulWaistProgressInches,
    body_fat_change_points: bodyFatChange,
    body_fat_progress_supporting:
      bodyFatChange !== null &&
      bodyFatChange <=
        -POLICY_THRESHOLDS.supportingBodyFatProgressPoints,
    diet_fatigue: dietFatigue,
    recovery_concern: recoveryConcern,
    cardio_completion_percent:
      cardioCompletion,
    cardio_target_met:
      cardioCompletion !== null &&
      cardioCompletion >=
        POLICY_THRESHOLDS.cardioCompletionMinimumPercent,
    cardio_addressed: isCardioAddressed({
      targetMinutes:
        input.current_prescription
          .weekly_cardio_target_minutes,
      intensity:
        input.current_prescription
          .cardio_intensity_target,
      recoveryConcern,
    }),
  }
}

function weekHasHighQualityPlateauData(
  week: PolicyWeekEvidence,
) {
  const adherence = finiteOrNull(
    week.nutrition_adherence_percent,
  )
  const coverage = finiteOrNull(
    week.nutrition_coverage_percent,
  )

  return (
    adherence !== null &&
    adherence >=
      POLICY_THRESHOLDS.nutritionAdherenceStrong &&
    coverage !== null &&
    coverage >=
      POLICY_THRESHOLDS.nutritionCoverageMinimum &&
    week.weight_readings >=
      POLICY_THRESHOLDS.weightReadingsMinimum &&
    finiteOrNull(week.average_weight_lbs) !== null
  )
}

export function hasThreeWeekPlateau(
  input: DeterministicPolicyInput,
) {
  const latest = [...input.recent_weeks]
    .sort(
      (a, b) =>
        a.week_number - b.week_number,
    )
    .slice(
      -POLICY_THRESHOLDS.calorieResetPlateauWeeks,
    )

  if (
    latest.length <
      POLICY_THRESHOLDS.calorieResetPlateauWeeks ||
    !latest.every(weekHasHighQualityPlateauData)
  ) {
    return false
  }

  for (let index = 1; index < latest.length; index += 1) {
    if (
      latest[index].week_number !==
      latest[index - 1].week_number + 1
    ) {
      return false
    }
  }

  const first = latest[0]
  const last = latest.at(-1)!
  const firstWeight = Number(first.average_weight_lbs)
  const lastWeight = Number(last.average_weight_lbs)
  const targetRate = finiteOrNull(
    input.target_loss_rate_pct_per_week,
  )

  if (targetRate === null || targetRate <= 0) {
    return false
  }

  const intervals = latest.length - 1
  const expectedLoss =
    firstWeight *
    (targetRate / 100) *
    intervals
  const actualLoss = firstWeight - lastWeight

  // "Flat" is intentionally stricter than the normal
  // <75% slow-progress gate. Reset requires prolonged
  // near-stall, not merely slower-than-target progress.
  const flatWeightTrend =
    actualLoss < expectedLoss * 0.25

  const firstWaist = finiteOrNull(
    first.waist_inches,
  )
  const lastWaist = finiteOrNull(
    last.waist_inches,
  )

  const waistStillProgressing =
    firstWaist !== null &&
    lastWaist !== null &&
    lastWaist - firstWaist <=
      -POLICY_THRESHOLDS.meaningfulWaistProgressInches

  const firstBodyFat = finiteOrNull(
    first.body_fat_percent,
  )
  const lastBodyFat = finiteOrNull(
    last.body_fat_percent,
  )

  const bodyFatStillProgressing =
    firstBodyFat !== null &&
    lastBodyFat !== null &&
    lastBodyFat - firstBodyFat <=
      -POLICY_THRESHOLDS.supportingBodyFatProgressPoints

  return (
    flatWeightTrend &&
    !waistStillProgressing &&
    !bodyFatStillProgressing
  )
}
