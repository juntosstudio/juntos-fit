import type { ValidatedAdjustmentJudgment } from './judgmentTypes.ts'

const DAY_MS = 86_400_000

function dateKeyToMs(dateKey: string) {
  const [year, month, day] = dateKey
    .split('-')
    .map(Number)

  return Date.UTC(year, month - 1, day)
}

export function addDateKeyDays(
  dateKey: string,
  days: number,
) {
  return new Date(
    dateKeyToMs(dateKey) + days * DAY_MS,
  )
    .toISOString()
    .slice(0, 10)
}

export function resolveProposalEffectiveDate(
  packet: any,
) {
  const weekEnd = String(
    packet?.current_week?.week_range?.end ?? '',
  ).trim()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekEnd)) {
    throw new Error(
      'Plan Adjustment cannot resolve the next prescription effective date.',
    )
  }

  return addDateKeyDays(weekEnd, 1)
}

export function resolveBasedOnTargetId(
  packet: any,
) {
  const currentSegments = Array.isArray(
    packet?.current_week?.prescription,
  )
    ? packet.current_week.prescription
    : []

  const currentTargetId = [...currentSegments]
    .reverse()
    .map((segment) => segment?.source_target_id)
    .find(Boolean)

  if (currentTargetId) {
    return String(currentTargetId)
  }

  const history = Array.isArray(
    packet?.prescription_history,
  )
    ? packet.prescription_history
    : []

  const historyTargetId = [...history]
    .reverse()
    .map((target) => target?.id)
    .find(Boolean)

  return historyTargetId
    ? String(historyTargetId)
    : null
}

export function toPublicAdjustmentProposal(row: any) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    coaching_plan_id: row.coaching_plan_id,
    weekly_checkin_id: row.weekly_checkin_id,
    weekly_coach_review_id:
      row.weekly_coach_review_id,
    based_on_target_id: row.based_on_target_id,
    revision_number: row.revision_number,
    supersedes_proposal_id:
      row.supersedes_proposal_id,
    decision_type: row.decision_type,
    action_id: row.action_id,
    status: row.status,
    proposed_prescription: {
      calorie_target:
        row.proposed_calorie_target,
      protein_grams:
        row.proposed_protein_grams,
      carb_grams: row.proposed_carb_grams,
      fat_grams: row.proposed_fat_grams,
      weekly_cardio_target_minutes:
        row.proposed_weekly_cardio_target_minutes,
      weekly_workout_target:
        row.proposed_weekly_workout_target,
      daily_water_goal_oz:
        row.proposed_daily_water_goal_oz,
      cardio_intensity_target:
        row.proposed_cardio_intensity_target,
      nutrition_ownership:
        row.proposed_nutrition_ownership,
    },
    proposed_effective_date:
      row.proposed_effective_date,
    reason_codes: row.reason_codes ?? [],
    user_explanation: row.user_explanation,
    policy_version: row.policy_version,
    rules_version: row.rules_version,
    contract_version: row.contract_version,
    expires_at: row.expires_at,
    accepted_at: row.accepted_at,
    declined_at: row.declined_at,
    effective_date: row.effective_date,
    applied_target_id: row.applied_target_id,
    resolution_reason_code:
      row.resolution_reason_code,
    resolution_note: row.resolution_note,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function loadLatestAdjustmentProposal(
  admin: any,
  weeklyCheckInId: string,
) {
  const { data, error } = await admin
    .from('coaching_adjustment_proposals')
    .select('*')
    .eq('weekly_checkin_id', weeklyCheckInId)
    .order('revision_number', {
      ascending: false,
    })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ?? null
}

export async function createInitialAdjustmentProposal({
  admin,
  weeklyCheckIn,
  coachReview,
  packet,
  policy,
  judgment,
}: {
  admin: any
  weeklyCheckIn: any
  coachReview: any
  packet: any
  policy: any
  judgment: ValidatedAdjustmentJudgment
}) {
  const action = judgment.selected_action
  const prescription = action.proposed_prescription

  if (!prescription) {
    throw new Error(
      'Selected Plan Adjustment action is missing its deterministic prescription.',
    )
  }

  const row = {
    coaching_plan_id:
      weeklyCheckIn.coaching_plan_id,
    weekly_checkin_id: weeklyCheckIn.id,
    weekly_coach_review_id:
      coachReview.id,
    based_on_target_id:
      resolveBasedOnTargetId(packet),
    revision_number: 1,
    supersedes_proposal_id: null,
    decision_type: action.decision_type,
    action_id: action.action_id,
    status: 'proposed',
    proposed_calorie_target:
      prescription.calorie_target,
    proposed_protein_grams:
      prescription.protein_grams,
    proposed_carb_grams:
      prescription.carb_grams,
    proposed_fat_grams:
      prescription.fat_grams,
    proposed_weekly_cardio_target_minutes:
      prescription.weekly_cardio_target_minutes,
    proposed_weekly_workout_target:
      prescription.weekly_workout_target ?? null,
    proposed_daily_water_goal_oz:
      prescription.daily_water_goal_oz ?? null,
    proposed_cardio_intensity_target:
      prescription.cardio_intensity_target,
    proposed_nutrition_ownership:
      prescription.nutrition_ownership,
    proposed_effective_date:
      resolveProposalEffectiveDate(packet),
    reason_codes: action.reason_codes,
    user_explanation:
      judgment.user_explanation,
    policy_version: policy.policy_version,
    rules_version: policy.rules_version,
    contract_version: policy.contract_version,
  }

  const { data, error } = await admin
    .from('coaching_adjustment_proposals')
    .insert(row)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}
