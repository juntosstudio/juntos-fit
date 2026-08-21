import {
  buildCalorieResetAction,
  evaluateCalorieReset,
} from './calorieResetPolicy.ts'
import { buildCardioIncrease } from './cardioPolicy.ts'
import { buildNutritionDecrease, buildNutritionIncrease } from './nutritionPolicy.ts'
import {
  DETERMINISTIC_POLICY_CONTRACT_VERSION,
  DETERMINISTIC_POLICY_VERSION,
  DETERMINISTIC_RULES_VERSION,
  POLICY_CONSTRAINTS,
} from './policyConfig.ts'
import {
  copyPrescription,
  makeCandidate,
} from './policyGates.ts'
import { derivePolicySignals } from './policyMetrics.ts'
import type {
  CalorieResetEvaluation,
  DeterministicPolicyInput,
  DeterministicPolicyResult,
  PolicyActionCandidate,
  PolicyActionId,
  PolicySignals,
} from './policyTypes.ts'

function finalize(
  input: DeterministicPolicyInput,
  signals: PolicySignals,
  reset: CalorieResetEvaluation,
  candidates: PolicyActionCandidate[],
): DeterministicPolicyResult {
  return {
    policy_version:
      DETERMINISTIC_POLICY_VERSION,
    contract_version:
      DETERMINISTIC_POLICY_CONTRACT_VERSION,
    rules_version:
      DETERMINISTIC_RULES_VERSION,
    completed_week_number:
      input.completed_week_number,
    signals,
    calorie_reset: reset,
    legal_actions: candidates.filter(
      (candidate) => candidate.legal,
    ),
    blocked_actions: candidates.filter(
      (candidate) => !candidate.legal,
    ),
    constraints: [...POLICY_CONSTRAINTS],
  }
}

function unsupportedGoalCandidates(
  input: DeterministicPolicyInput,
  signals: PolicySignals,
  reset: CalorieResetEvaluation,
) {
  const blocker =
    'GOAL_NOT_SUPPORTED_FOR_ADJUSTMENT' as const

  const blockedIds: PolicyActionId[] = [
    'nutrition_decrease_100',
    'nutrition_increase_100',
    'cardio_increase_60_to_75',
    'cardio_increase_75_to_90',
    'cardio_increase_intensity_to_moderate',
    'calorie_reset_increase_100',
  ]

  const blocked = blockedIds.map(
    (actionId) =>
      makeCandidate({
        actionId,
        category:
          actionId.startsWith('nutrition')
            ? 'nutrition'
            : actionId.startsWith('cardio')
              ? 'cardio'
              : 'calorie_reset',
        legal: false,
        reasons: [blocker],
        blockers: [blocker],
      }),
  )

  return finalize(
    input,
    signals,
    reset,
    [
      makeCandidate({
        actionId: 'hold',
        category: 'hold',
        legal: true,
        reasons: [
          'HOLD_ALWAYS_LEGAL',
          blocker,
        ],
        proposedPrescription:
          copyPrescription(
            input.current_prescription,
          ),
      }),
      ...blocked,
    ],
  )
}

export function evaluateDeterministicPolicy(
  input: DeterministicPolicyInput,
): DeterministicPolicyResult {
  const signals = derivePolicySignals(input)
  const reset = evaluateCalorieReset(
    input,
    signals,
  )

  if (input.goal !== 'fat_loss') {
    return unsupportedGoalCandidates(
      input,
      signals,
      reset,
    )
  }

  const hold = makeCandidate({
    actionId: 'hold',
    category: 'hold',
    legal: true,
    reasons: [
      'HOLD_ALWAYS_LEGAL',
      'FAT_LOSS_POLICY_ACTIVE',
    ],
    proposedPrescription:
      copyPrescription(
        input.current_prescription,
      ),
  })

  return finalize(
    input,
    signals,
    reset,
    [
      hold,
      buildNutritionDecrease(input, signals),
      buildNutritionIncrease(input, signals),
      buildCardioIncrease(input, signals),
      buildCalorieResetAction(input, reset),
    ],
  )
}
