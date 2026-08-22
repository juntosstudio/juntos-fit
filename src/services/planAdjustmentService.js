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

const PLAN_ADJUSTMENT_MESSAGE_FIELDS = `
  id,
  coaching_plan_id,
  weekly_checkin_id,
  proposal_id,
  role,
  content,
  in_reply_to_message_id,
  created_at
`

export function createPlanAdjustmentClientMessageId() {
  return crypto.randomUUID()
}

export async function loadPlanAdjustmentConversation(
  weeklyCheckInId,
) {
  if (!weeklyCheckInId) {
    return []
  }

  const { data, error } = await supabase
    .from('coaching_adjustment_messages')
    .select(PLAN_ADJUSTMENT_MESSAGE_FIELDS)
    .eq('weekly_checkin_id', weeklyCheckInId)
    .order('created_at', {
      ascending: true,
    })
    .order('id', {
      ascending: true,
    })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function sendPlanAdjustmentMessage({
  weeklyCheckInId,
  message,
  clientMessageId,
}) {
  const cleanMessage = String(message ?? '').trim()

  if (!weeklyCheckInId) {
    throw new Error(
      'A completed Weekly Check-In is required.',
    )
  }

  if (!cleanMessage) {
    throw new Error(
      'Enter a message for Juntos Coach.',
    )
  }

  if (!clientMessageId) {
    throw new Error(
      'A client message id is required.',
    )
  }

  const { data, error } =
    await supabase.functions.invoke(
      'continue-plan-adjustment',
      {
        body: {
          weekly_checkin_id: weeklyCheckInId,
          message: cleanMessage,
          client_message_id: clientMessageId,
        },
      },
    )

  if (error) {
    let errorMessage =
      'Juntos Coach could not continue the Plan Adjustment discussion right now.'

    try {
      const details =
        await error.context?.json?.()

      if (details?.error) {
        errorMessage = details.error
      }
    } catch {
      // Keep the user-safe fallback message.
    }

    throw new Error(errorMessage)
  }

  if (!data?.proposal || !data?.message) {
    throw new Error(
      'Juntos Coach did not return a complete Plan Adjustment response.',
    )
  }

  return data
}


export async function resolvePlanAdjustment({
  proposalId,
  resolution,
}) {
  if (!proposalId) {
    throw new Error(
      'A Plan Adjustment proposal is required.',
    )
  }

  if (
    resolution !== 'accept' &&
    resolution !== 'decline'
  ) {
    throw new Error(
      'Plan Adjustment resolution must be accept or decline.',
    )
  }

  const { data, error } =
    await supabase.functions.invoke(
      'resolve-plan-adjustment',
      {
        body: {
          proposal_id: proposalId,
          resolution,
        },
      },
    )

  if (error) {
    let errorMessage =
      'Juntos Coach could not resolve this Plan Adjustment right now.'

    try {
      const details =
        await error.context?.json?.()

      if (details?.error) {
        errorMessage = details.error
      }
    } catch {
      // Keep the user-safe fallback message.
    }

    throw new Error(errorMessage)
  }

  if (!data?.proposal || !data?.outcome) {
    throw new Error(
      'Juntos Coach did not return a complete Plan Adjustment resolution.',
    )
  }

  return data
}

export function acceptPlanAdjustment(proposalId) {
  return resolvePlanAdjustment({
    proposalId,
    resolution: 'accept',
  })
}

export function declinePlanAdjustment(proposalId) {
  return resolvePlanAdjustment({
    proposalId,
    resolution: 'decline',
  })
}
