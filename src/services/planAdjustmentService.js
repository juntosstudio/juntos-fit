import { supabase } from '../lib/supabase'

const PLAN_ADJUSTMENT_FIELDS = `
  id,
  coaching_plan_id,
  weekly_checkin_id,
  weekly_coach_review_id,
  based_on_target_id,
  revision_number,
  supersedes_proposal_id,
  decision_type,
  action_id,
  status,
  proposed_calorie_target,
  proposed_protein_grams,
  proposed_carb_grams,
  proposed_fat_grams,
  proposed_weekly_cardio_target_minutes,
  proposed_weekly_workout_target,
  proposed_daily_water_goal_oz,
  proposed_cardio_intensity_target,
  proposed_nutrition_ownership,
  proposed_effective_date,
  reason_codes,
  user_explanation,
  policy_version,
  rules_version,
  contract_version,
  expires_at,
  accepted_at,
  declined_at,
  effective_date,
  applied_target_id,
  resolution_reason_code,
  resolution_note,
  created_at,
  updated_at
`

function normalizeProposal(row) {
  if (!row) {
    return null
  }

  return {
    ...row,
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
  }
}

export async function loadLatestPlanAdjustment(
  weeklyCheckInId,
) {
  if (!weeklyCheckInId) {
    return null
  }

  const { data, error } = await supabase
    .from('coaching_adjustment_proposals')
    .select(PLAN_ADJUSTMENT_FIELDS)
    .eq('weekly_checkin_id', weeklyCheckInId)
    .order('revision_number', {
      ascending: false,
    })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return normalizeProposal(data)
}

export async function generatePlanAdjustment(
  weeklyCheckInId,
) {
  if (!weeklyCheckInId) {
    throw new Error(
      'A completed Weekly Check-In is required.',
    )
  }

  const { data, error } =
    await supabase.functions.invoke(
      'generate-plan-adjustment',
      {
        body: {
          weekly_checkin_id:
            weeklyCheckInId,
        },
      },
    )

  if (error) {
    let message =
      'Juntos Coach could not prepare your Plan Adjustment right now.'

    try {
      const details =
        await error.context?.json?.()

      if (details?.error) {
        message = details.error
      }
    } catch {
      // Keep the user-safe fallback message.
    }

    throw new Error(message)
  }

  if (!data?.proposal) {
    throw new Error(
      'Juntos Coach did not return a Plan Adjustment.',
    )
  }

  return data.proposal
}
