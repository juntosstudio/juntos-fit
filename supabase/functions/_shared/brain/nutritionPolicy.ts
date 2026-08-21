import { applyRoutineCalorieAdjustment } from './macroPolicy.ts'
import { POLICY_THRESHOLDS } from './policyConfig.ts'
import {
  basePositiveReasons,
  makeCandidate,
  nutritionEvidenceBlockers,
  paceReason,
  sharedNormalChangeBlockers,
} from './policyGates.ts'
import type {
  DeterministicPolicyInput,
  PolicyActionCandidate,
  PolicyReasonCode,
  PolicySignals,
} from './policyTypes.ts'

export function buildNutritionDecrease(
  input: DeterministicPolicyInput,
  signals: PolicySignals,
): PolicyActionCandidate {
  const reasons = basePositiveReasons(input)
  const blockers = [
    ...sharedNormalChangeBlockers(input),
    ...nutritionEvidenceBlockers(input),
  ]

  if (
    input.current_prescription.nutrition_ownership !==
    'juntos_managed'
  ) {
    blockers.push('NUTRITION_SELF_MANAGED')
  }

  const pace =
    signals.weight_pace.pace_percent_of_target
  const paceCode = paceReason(pace)

  if (paceCode) {
    reasons.push(paceCode)
  }

  if (
    pace === null ||
    pace >=
      POLICY_THRESHOLDS.paceSlowUpperExclusive
  ) {
    if (
      pace !== null &&
      pace >
        POLICY_THRESHOLDS.paceOnTargetUpperInclusive
    ) {
      blockers.push('PACE_FAST_GT_125')
    } else if (pace !== null) {
      blockers.push('PACE_ON_TARGET_75_TO_125')
    }
  }

  if (signals.waist_change_inches === null) {
    reasons.push('WAIST_DATA_UNAVAILABLE')
  } else if (signals.meaningful_waist_progress) {
    blockers.push('WAIST_PROGRESS_PRESENT')
    reasons.push('WAIST_PROGRESS_PRESENT')
  } else {
    reasons.push('NO_MEANINGFUL_WAIST_PROGRESS')
  }

  if (signals.body_fat_progress_supporting) {
    reasons.push('BODY_FAT_PROGRESS_SUPPORTING')
  }

  if (signals.diet_fatigue) {
    blockers.push('DIET_FATIGUE_PRESENT')
    reasons.push('DIET_FATIGUE_PRESENT')
  } else {
    reasons.push('DIET_FATIGUE_NOT_PRESENT')
  }

  if (signals.recovery_concern) {
    blockers.push('RECOVERY_CONCERN_PRESENT')
    reasons.push('RECOVERY_CONCERN_PRESENT')
  } else {
    reasons.push('RECOVERY_CONCERN_NOT_PRESENT')
  }

  const macroAdjustment =
    applyRoutineCalorieAdjustment({
      prescription:
        input.current_prescription,
      direction: 'decrease',
      preference:
        input.macro_distribution_preference,
      minimumFatGrams:
        input.minimum_fat_grams,
    })

  if (!macroAdjustment.legal) {
    blockers.push('MACRO_ADJUSTMENT_BLOCKED')
  } else {
    reasons.push('MACRO_ADJUSTMENT_AVAILABLE')
  }

  return makeCandidate({
    actionId: 'nutrition_decrease_100',
    category: 'nutrition',
    legal: blockers.length === 0,
    reasons,
    blockers,
    proposedPrescription:
      macroAdjustment.proposed_prescription,
  })
}

export function buildNutritionIncrease(
  input: DeterministicPolicyInput,
  signals: PolicySignals,
): PolicyActionCandidate {
  const reasons = basePositiveReasons(input)
  const blockers: PolicyReasonCode[] = [
    ...sharedNormalChangeBlockers(input),
    ...nutritionEvidenceBlockers(input),
  ]

  if (
    input.current_prescription.nutrition_ownership !==
    'juntos_managed'
  ) {
    blockers.push('NUTRITION_SELF_MANAGED')
  }

  const pace =
    signals.weight_pace.pace_percent_of_target
  const paceCode = paceReason(pace)

  if (paceCode) {
    reasons.push(paceCode)
  }

  const fastLoss =
    pace !== null &&
    pace >
      POLICY_THRESHOLDS.paceOnTargetUpperInclusive

  const fatigueAtMeaningfulPace =
    signals.diet_fatigue &&
    pace !== null &&
    pace >=
      POLICY_THRESHOLDS.paceSlowUpperExclusive

  if (!fastLoss && !fatigueAtMeaningfulPace) {
    if (paceCode) {
      blockers.push(paceCode)
    } else {
      blockers.push('TARGET_LOSS_RATE_MISSING')
    }
  }

  if (signals.diet_fatigue) {
    reasons.push('DIET_FATIGUE_PRESENT')
  } else {
    reasons.push('DIET_FATIGUE_NOT_PRESENT')
  }

  const macroAdjustment =
    applyRoutineCalorieAdjustment({
      prescription:
        input.current_prescription,
      direction: 'increase',
      preference:
        input.macro_distribution_preference,
      minimumFatGrams:
        input.minimum_fat_grams,
    })

  if (!macroAdjustment.legal) {
    blockers.push('MACRO_ADJUSTMENT_BLOCKED')
  } else {
    reasons.push('MACRO_ADJUSTMENT_AVAILABLE')
  }

  return makeCandidate({
    actionId: 'nutrition_increase_100',
    category: 'nutrition',
    legal: blockers.length === 0,
    reasons,
    blockers,
    proposedPrescription:
      macroAdjustment.proposed_prescription,
  })
}
