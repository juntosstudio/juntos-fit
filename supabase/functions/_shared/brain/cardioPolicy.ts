import { POLICY_THRESHOLDS } from './policyConfig.ts'
import {
  basePositiveReasons,
  copyPrescription,
  makeCandidate,
  nutritionEvidenceBlockers,
  paceReason,
  sharedNormalChangeBlockers,
} from './policyGates.ts'
import type {
  DeterministicPolicyInput,
  PolicyActionCandidate,
  PolicySignals,
} from './policyTypes.ts'

function cardioProgression(
  input: DeterministicPolicyInput,
) {
  const target =
    input.current_prescription
      .weekly_cardio_target_minutes
  const intensity =
    input.current_prescription
      .cardio_intensity_target

  if (target === 60) {
    return {
      actionId:
        'cardio_increase_60_to_75' as const,
      reason:
        'CARDIO_LADDER_60_TO_75' as const,
      proposed: {
        ...copyPrescription(
          input.current_prescription,
        ),
        weekly_cardio_target_minutes: 75,
      },
    }
  }

  if (target === 75) {
    return {
      actionId:
        'cardio_increase_75_to_90' as const,
      reason:
        'CARDIO_LADDER_75_TO_90' as const,
      proposed: {
        ...copyPrescription(
          input.current_prescription,
        ),
        weekly_cardio_target_minutes: 90,
      },
    }
  }

  if (
    target === 90 &&
    (intensity === null || intensity === 'easy')
  ) {
    return {
      actionId:
        'cardio_increase_intensity_to_moderate' as const,
      reason:
        'CARDIO_INTENSITY_CAN_PROGRESS' as const,
      proposed: {
        ...copyPrescription(
          input.current_prescription,
        ),
        cardio_intensity_target:
          'moderate' as const,
      },
    }
  }

  return null
}

export function buildCardioIncrease(
  input: DeterministicPolicyInput,
  signals: PolicySignals,
): PolicyActionCandidate {
  const progression = cardioProgression(input)
  const reasons = basePositiveReasons(input)
  const blockers = [
    ...sharedNormalChangeBlockers(input),
    ...nutritionEvidenceBlockers(input),
  ]

  if (!progression) {
    blockers.push(
      signals.cardio_addressed
        ? 'CARDIO_ALREADY_ADDRESSED'
        : 'CARDIO_TARGET_NOT_ON_POLICY_LADDER',
    )
  } else {
    reasons.push(progression.reason)
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
    blockers.push(
      paceCode ?? 'TARGET_LOSS_RATE_MISSING',
    )
  }

  if (!signals.cardio_target_met) {
    blockers.push('CARDIO_TARGET_NOT_MET')
  } else {
    reasons.push('CARDIO_TARGET_MET')
  }

  if (signals.waist_change_inches === null) {
    reasons.push('WAIST_DATA_UNAVAILABLE')
  } else if (signals.meaningful_waist_progress) {
    blockers.push('WAIST_PROGRESS_PRESENT')
    reasons.push('WAIST_PROGRESS_PRESENT')
  } else {
    reasons.push('NO_MEANINGFUL_WAIST_PROGRESS')
  }

  if (signals.diet_fatigue) {
    blockers.push('DIET_FATIGUE_PRESENT')
    reasons.push('DIET_FATIGUE_PRESENT')
  }

  if (signals.recovery_concern) {
    blockers.push('RECOVERY_CONCERN_PRESENT')
    reasons.push('RECOVERY_CONCERN_PRESENT')
  } else {
    reasons.push('RECOVERY_CONCERN_NOT_PRESENT')
  }

  return makeCandidate({
    actionId:
      progression?.actionId ??
      'cardio_progression_unavailable',
    category: 'cardio',
    legal:
      progression !== null &&
      blockers.length === 0,
    reasons,
    blockers,
    proposedPrescription:
      progression?.proposed ?? null,
  })
}
