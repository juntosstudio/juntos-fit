import {
  toPublicAdjustmentProposal,
} from './planAdjustmentRepository.ts'

export type AdjustmentResolution =
  | 'accept'
  | 'decline'

export type AdjustmentResolutionOutcome =
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'stale'

export function isAdjustmentResolution(
  value: string,
): value is AdjustmentResolution {
  return value === 'accept' || value === 'decline'
}

export function toPublicAppliedTarget(row: any) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    coaching_plan_id: row.coaching_plan_id,
    effective_date: row.effective_date,
    calorie_target: row.calorie_target,
    protein_grams: row.protein_grams,
    carb_grams: row.carb_grams,
    fat_grams: row.fat_grams,
    weekly_cardio_target_minutes:
      row.weekly_cardio_target_minutes,
    weekly_workout_target:
      row.weekly_workout_target,
    daily_water_goal_oz:
      row.daily_water_goal_oz,
    cardio_intensity_target:
      row.cardio_intensity_target,
    nutrition_ownership:
      row.nutrition_ownership,
    prescription_source:
      row.prescription_source,
    created_at: row.created_at,
  }
}

export async function resolveAdjustmentProposal({
  admin,
  proposalId,
  resolution,
}: {
  admin: any
  proposalId: string
  resolution: AdjustmentResolution
}) {
  const { data, error } = await admin.rpc(
    'resolve_coaching_adjustment_proposal',
    {
      p_proposal_id: proposalId,
      p_resolution: resolution,
    },
  )

  if (error) {
    throw error
  }

  if (!data?.proposal || !data?.outcome) {
    throw new Error(
      'Plan Adjustment resolution did not return a complete result.',
    )
  }

  return {
    outcome:
      data.outcome as AdjustmentResolutionOutcome,
    cached: Boolean(data.cached),
    proposal: toPublicAdjustmentProposal(
      data.proposal,
    ),
    applied_target: toPublicAppliedTarget(
      data.applied_target,
    ),
  }
}
