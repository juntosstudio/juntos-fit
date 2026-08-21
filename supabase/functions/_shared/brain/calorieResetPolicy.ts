import { applyCalorieResetIncrease } from './macroPolicy.ts'
import { POLICY_THRESHOLDS } from './policyConfig.ts'
import {
  makeCandidate,
  sharedNormalChangeBlockers,
} from './policyGates.ts'
import { hasThreeWeekPlateau } from './policyMetrics.ts'
import type {
  CalorieResetEvaluation,
  DeterministicPolicyInput,
  PolicyActionCandidate,
  PolicyReasonCode,
  PolicySignals,
} from './policyTypes.ts'

export function evaluateCalorieReset(
  input: DeterministicPolicyInput,
  signals: PolicySignals,
): CalorieResetEvaluation {
  const deficitWeeks =
    input.history.continuous_deficit_weeks
  const durationMet =
    deficitWeeks !== null &&
    deficitWeeks >=
      POLICY_THRESHOLDS.calorieResetMinimumDeficitWeeks

  const reductionsMet =
    input.history.prior_calorie_reductions >=
    POLICY_THRESHOLDS.calorieResetMinimumPriorReductions

  const plateauMet = hasThreeWeekPlateau(input)
  const fatigueMet = signals.diet_fatigue
  const cardioMet = signals.cardio_addressed

  const criteria = {
    continuous_deficit_weeks: durationMet,
    prior_calorie_reductions: reductionsMet,
    cardio_addressed: cardioMet,
    three_week_plateau: plateauMet,
    diet_fatigue: fatigueMet,
  }

  const reasonCodes: PolicyReasonCode[] = [
    durationMet
      ? 'RESET_DEFICIT_DURATION_MET'
      : 'RESET_DEFICIT_DURATION_NOT_MET',
    reductionsMet
      ? 'RESET_PRIOR_REDUCTIONS_MET'
      : 'RESET_PRIOR_REDUCTIONS_NOT_MET',
    cardioMet
      ? 'RESET_CARDIO_ADDRESSED'
      : 'RESET_CARDIO_NOT_ADDRESSED',
    plateauMet
      ? 'RESET_THREE_WEEK_PLATEAU_MET'
      : 'RESET_THREE_WEEK_PLATEAU_NOT_MET',
    fatigueMet
      ? 'RESET_DIET_FATIGUE_MET'
      : 'RESET_DIET_FATIGUE_NOT_MET',
  ]

  if (
    input.goal === 'fat_loss' &&
    durationMet &&
    reductionsMet &&
    cardioMet &&
    plateauMet &&
    fatigueMet
  ) {
    reasonCodes.push('RESET_ELIGIBLE')

    return {
      status: 'eligible',
      criteria,
      reason_codes: reasonCodes,
    }
  }

  const watch =
    input.goal === 'fat_loss' &&
    deficitWeeks !== null &&
    deficitWeeks >=
      POLICY_THRESHOLDS.calorieResetWatchDeficitWeeks &&
    (reductionsMet || plateauMet || fatigueMet)

  if (watch) {
    reasonCodes.push('RESET_WATCH')
  }

  return {
    status: watch
      ? 'watch'
      : 'not_eligible',
    criteria,
    reason_codes: reasonCodes,
  }
}

export function buildCalorieResetAction(
  input: DeterministicPolicyInput,
  reset: CalorieResetEvaluation,
): PolicyActionCandidate {
  const reasons = [...reset.reason_codes]
  const blockers: PolicyReasonCode[] = [
    ...sharedNormalChangeBlockers(input),
  ]

  if (reset.status !== 'eligible') {
    blockers.push(
      ...reset.reason_codes.filter(
        (code) => code.endsWith('_NOT_MET'),
      ),
    )
  }

  if (
    input.current_prescription.nutrition_ownership !==
    'juntos_managed'
  ) {
    blockers.push('NUTRITION_SELF_MANAGED')
  }

  const macroAdjustment =
    applyCalorieResetIncrease({
      prescription:
        input.current_prescription,
    })

  if (!macroAdjustment.legal) {
    blockers.push('MACRO_ADJUSTMENT_BLOCKED')
  } else {
    reasons.push('MACRO_ADJUSTMENT_AVAILABLE')
  }

  return makeCandidate({
    actionId: 'calorie_reset_increase_100',
    category: 'calorie_reset',
    legal: blockers.length === 0,
    reasons,
    blockers,
    proposedPrescription:
      macroAdjustment.proposed_prescription,
  })
}
