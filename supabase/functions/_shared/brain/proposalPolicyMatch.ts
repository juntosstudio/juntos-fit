import type {
  PolicyActionCandidate,
} from './policyTypes.ts'

function sameNullableValue(
  left: unknown,
  right: unknown,
) {
  const normalizedLeft = left ?? null
  const normalizedRight = right ?? null

  return normalizedLeft === normalizedRight
}

export function proposalMatchesPolicyAction(
  proposal: any,
  action: PolicyActionCandidate | null | undefined,
) {
  if (!proposal || !action?.legal) {
    return false
  }

  if (
    String(proposal.action_id ?? '') !==
    String(action.action_id ?? '')
  ) {
    return false
  }

  if (
    String(proposal.decision_type ?? '') !==
    String(action.decision_type ?? '')
  ) {
    return false
  }

  const prescription = action.proposed_prescription

  if (!prescription) {
    return false
  }

  return (
    sameNullableValue(
      proposal.proposed_calorie_target,
      prescription.calorie_target,
    ) &&
    sameNullableValue(
      proposal.proposed_protein_grams,
      prescription.protein_grams,
    ) &&
    sameNullableValue(
      proposal.proposed_carb_grams,
      prescription.carb_grams,
    ) &&
    sameNullableValue(
      proposal.proposed_fat_grams,
      prescription.fat_grams,
    ) &&
    sameNullableValue(
      proposal.proposed_weekly_cardio_target_minutes,
      prescription.weekly_cardio_target_minutes,
    ) &&
    sameNullableValue(
      proposal.proposed_weekly_workout_target,
      prescription.weekly_workout_target,
    ) &&
    sameNullableValue(
      proposal.proposed_daily_water_goal_oz,
      prescription.daily_water_goal_oz,
    ) &&
    sameNullableValue(
      proposal.proposed_cardio_intensity_target,
      prescription.cardio_intensity_target,
    ) &&
    sameNullableValue(
      proposal.proposed_nutrition_ownership,
      prescription.nutrition_ownership,
    )
  )
}
