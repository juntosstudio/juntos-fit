import type {
  DeterministicPolicyResult,
  PolicyActionCandidate,
} from './policyTypes.ts'
import {
  toPublicAdjustmentProposal,
} from './planAdjustmentRepository.ts'
import type { ValidatedAdjustmentConversationTurn } from './conversationTypes.ts'

const MAX_CONVERSATION_MESSAGES = 30

export function toPublicAdjustmentMessage(row: any) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    coaching_plan_id: row.coaching_plan_id,
    weekly_checkin_id: row.weekly_checkin_id,
    proposal_id: row.proposal_id,
    role: row.role,
    content: row.content,
    in_reply_to_message_id:
      row.in_reply_to_message_id ?? null,
    created_at: row.created_at,
  }
}

export async function loadAdjustmentConversation(
  admin: any,
  weeklyCheckInId: string,
) {
  const [proposalResult, messageResult] =
    await Promise.all([
      admin
        .from('coaching_adjustment_proposals')
        .select('*')
        .eq('weekly_checkin_id', weeklyCheckInId)
        .order('revision_number', {
          ascending: true,
        }),
      admin
        .from('coaching_adjustment_messages')
        .select('*')
        .eq('weekly_checkin_id', weeklyCheckInId)
        .order('created_at', {
          ascending: false,
        })
        .order('id', {
          ascending: false,
        })
        .limit(MAX_CONVERSATION_MESSAGES),
    ])

  if (proposalResult.error) {
    throw proposalResult.error
  }

  if (messageResult.error) {
    throw messageResult.error
  }

  const messages = [
    ...(messageResult.data ?? []),
  ].reverse()

  return {
    proposals: proposalResult.data ?? [],
    messages,
  }
}


export async function loadAdjustmentProposalById(
  admin: any,
  proposalId: string,
) {
  const { data, error } = await admin
    .from('coaching_adjustment_proposals')
    .select('*')
    .eq('id', proposalId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ?? null
}

export async function ensureUserAdjustmentMessage({
  admin,
  currentProposal,
  content,
  clientMessageId,
}: {
  admin: any
  currentProposal: any
  content: string
  clientMessageId: string
}) {
  const row = {
    coaching_plan_id:
      currentProposal.coaching_plan_id,
    weekly_checkin_id:
      currentProposal.weekly_checkin_id,
    proposal_id: currentProposal.id,
    role: 'user',
    content,
    client_message_id: clientMessageId,
  }

  const { data, error } = await admin
    .from('coaching_adjustment_messages')
    .insert(row)
    .select('*')
    .single()

  if (!error) {
    return {
      message: data,
      cached: false,
    }
  }

  if (String(error?.code ?? '') !== '23505') {
    throw error
  }

  const { data: existing, error: loadError } =
    await admin
      .from('coaching_adjustment_messages')
      .select('*')
      .eq(
        'weekly_checkin_id',
        currentProposal.weekly_checkin_id,
      )
      .eq('role', 'user')
      .eq('client_message_id', clientMessageId)
      .maybeSingle()

  if (loadError) {
    throw loadError
  }

  if (!existing) {
    throw error
  }

  if (
    String(existing.content ?? '').trim() !==
    content.trim()
  ) {
    throw new Error(
      'The Plan Adjustment message id was already used for different content.',
    )
  }

  return {
    message: existing,
    cached: true,
  }
}

export async function loadCoachReplyForUserMessage(
  admin: any,
  userMessageId: string,
) {
  const { data, error } = await admin
    .from('coaching_adjustment_messages')
    .select('*')
    .eq('role', 'coach')
    .eq('in_reply_to_message_id', userMessageId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ?? null
}

function revisionPayload(
  action: PolicyActionCandidate,
  policy: DeterministicPolicyResult,
) {
  const prescription = action.proposed_prescription

  if (!prescription) {
    throw new Error(
      'Conversation revision action is missing its deterministic prescription.',
    )
  }

  return {
    decision_type: action.decision_type,
    action_id: action.action_id,
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
    reason_codes: action.reason_codes,
    policy_version: policy.policy_version,
    rules_version: policy.rules_version,
    contract_version: policy.contract_version,
  }
}

export async function finalizeAdjustmentConversationTurn({
  admin,
  currentProposal,
  userMessage,
  validatedTurn,
  policy,
}: {
  admin: any
  currentProposal: any
  userMessage: any
  validatedTurn: ValidatedAdjustmentConversationTurn
  policy: DeterministicPolicyResult
}) {
  const revision = validatedTurn.should_revise
    ? revisionPayload(
        validatedTurn.selected_action!,
        policy,
      )
    : null

  const { data, error } = await admin.rpc(
    'finalize_coaching_adjustment_turn',
    {
      p_current_proposal_id:
        currentProposal.id,
      p_user_message_id: userMessage.id,
      p_coach_reply:
        validatedTurn.coach_reply,
      p_revision: revision,
    },
  )

  if (error) {
    throw error
  }

  return {
    proposal: toPublicAdjustmentProposal(
      data?.proposal,
    ),
    message: toPublicAdjustmentMessage(
      data?.message,
    ),
    revised: Boolean(data?.revised),
    cached: Boolean(data?.cached),
  }
}
