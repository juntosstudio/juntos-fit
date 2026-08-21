import { POLICY_THRESHOLDS } from './policyConfig.ts'
import type {
  DeterministicPolicyInput,
  PolicyActionCandidate,
  PolicyActionCategory,
  PolicyActionId,
  PolicyPrescription,
  PolicyReasonCode,
} from './policyTypes.ts'

export function uniqueReasons(
  reasons: PolicyReasonCode[],
) {
  return [...new Set(reasons)]
}

export function copyPrescription(
  prescription: PolicyPrescription,
): PolicyPrescription {
  return {
    ...prescription,
  }
}

export function makeCandidate({
  actionId,
  category,
  legal,
  reasons,
  blockers = [],
  proposedPrescription = null,
}: {
  actionId: PolicyActionId
  category: PolicyActionCategory
  legal: boolean
  reasons: PolicyReasonCode[]
  blockers?: PolicyReasonCode[]
  proposedPrescription?: PolicyPrescription | null
}): PolicyActionCandidate {
  return {
    action_id: actionId,
    category,
    decision_type:
      actionId === 'hold'
        ? 'hold'
        : 'recommend_change',
    legal,
    reason_codes: uniqueReasons(reasons),
    blocker_codes: uniqueReasons(blockers),
    proposed_prescription:
      legal ? proposedPrescription : null,
  }
}

export function paceReason(
  pace: number | null,
): PolicyReasonCode | null {
  if (pace === null || !Number.isFinite(pace)) {
    return null
  }

  if (
    pace <
    POLICY_THRESHOLDS.paceVerySlowUpperExclusive
  ) {
    return 'PACE_VERY_SLOW_LT_50'
  }

  if (
    pace <
    POLICY_THRESHOLDS.paceSlowUpperExclusive
  ) {
    return 'PACE_SLOW_50_TO_74'
  }

  if (
    pace <=
    POLICY_THRESHOLDS.paceOnTargetUpperInclusive
  ) {
    return 'PACE_ON_TARGET_75_TO_125'
  }

  return 'PACE_FAST_GT_125'
}

export function sharedNormalChangeBlockers(
  input: DeterministicPolicyInput,
) {
  const blockers: PolicyReasonCode[] = []

  if (input.completed_week_number < 2) {
    blockers.push('FIRST_TWO_WEEKS_OBSERVATION')
  }

  if (
    input.history.full_weeks_under_current_prescription <
    POLICY_THRESHOLDS.fullObservationWeeksRequired
  ) {
    blockers.push('OBSERVATION_CLOCK_NOT_READY')
  }

  return blockers
}

export function nutritionEvidenceBlockers(
  input: DeterministicPolicyInput,
) {
  const blockers: PolicyReasonCode[] = []
  const adherence = Number(
    input.current_week.nutrition_adherence_percent,
  )
  const coverage = Number(
    input.current_week.nutrition_coverage_percent,
  )

  if (
    !Number.isFinite(coverage) ||
    coverage <
      POLICY_THRESHOLDS.nutritionCoverageMinimum
  ) {
    blockers.push('NUTRITION_COVERAGE_INSUFFICIENT')
  }

  if (
    !Number.isFinite(adherence) ||
    adherence <
      POLICY_THRESHOLDS.nutritionAdherenceStrong
  ) {
    blockers.push(
      Number.isFinite(adherence) &&
      adherence >=
        POLICY_THRESHOLDS.nutritionAdherenceUsable
        ? 'NUTRITION_ADHERENCE_USABLE_NOT_STRONG'
        : 'NUTRITION_ADHERENCE_INSUFFICIENT',
    )
  }

  if (
    input.current_week.weight_readings <
      POLICY_THRESHOLDS.weightReadingsMinimum ||
    input.previous_week === null ||
    input.previous_week.weight_readings <
      POLICY_THRESHOLDS.weightReadingsMinimum ||
    input.current_week.average_weight_lbs === null ||
    input.previous_week.average_weight_lbs === null
  ) {
    blockers.push('WEIGHT_DATA_INSUFFICIENT')
  }

  if (
    input.target_loss_rate_pct_per_week === null ||
    !Number.isFinite(
      Number(input.target_loss_rate_pct_per_week),
    ) ||
    Number(input.target_loss_rate_pct_per_week) <= 0
  ) {
    blockers.push('TARGET_LOSS_RATE_MISSING')
  }

  return blockers
}

export function basePositiveReasons(
  input: DeterministicPolicyInput,
) {
  const reasons: PolicyReasonCode[] = [
    'FAT_LOSS_POLICY_ACTIVE',
  ]

  if (
    input.history.full_weeks_under_current_prescription >=
      POLICY_THRESHOLDS.fullObservationWeeksRequired &&
    input.completed_week_number >= 2
  ) {
    reasons.push('OBSERVATION_CLOCK_READY')
  }

  if (
    input.current_prescription.nutrition_ownership ===
    'juntos_managed'
  ) {
    reasons.push('NUTRITION_JUNTOS_MANAGED')
  }

  const adherence = Number(
    input.current_week.nutrition_adherence_percent,
  )
  const coverage = Number(
    input.current_week.nutrition_coverage_percent,
  )

  if (
    Number.isFinite(adherence) &&
    adherence >=
      POLICY_THRESHOLDS.nutritionAdherenceStrong &&
    Number.isFinite(coverage) &&
    coverage >=
      POLICY_THRESHOLDS.nutritionCoverageMinimum
  ) {
    reasons.push('NUTRITION_ADHERENCE_STRONG')
  }

  if (
    input.current_week.weight_readings >=
      POLICY_THRESHOLDS.weightReadingsMinimum &&
    input.previous_week !== null &&
    input.previous_week.weight_readings >=
      POLICY_THRESHOLDS.weightReadingsMinimum
  ) {
    reasons.push('WEIGHT_DATA_SUFFICIENT')
  }

  return reasons
}
