import {
  KEEP_CURRENT_ACTION_ID,
  type ValidatedAdjustmentConversationTurn,
} from './conversationTypes.ts'
import type {
  DeterministicPolicyResult,
  PolicyActionCandidate,
} from './policyTypes.ts'
import {
  proposalMatchesPolicyAction,
} from './proposalPolicyMatch.ts'

function cleanCoachReply(value: unknown) {
  const text = String(value ?? '').trim()

  if (!text) {
    throw new Error(
      'BB conversation turn is missing coach_reply.',
    )
  }

  if (text.length > 3000) {
    throw new Error(
      'BB conversation coach_reply is too long.',
    )
  }

  return text
}

function findLegalAction(
  policy: DeterministicPolicyResult,
  actionId: string,
): PolicyActionCandidate | null {
  return (
    policy.legal_actions.find(
      (candidate) =>
        candidate.action_id === actionId &&
        candidate.legal,
    ) ?? null
  )
}

export function validateAdjustmentConversationTurn(
  candidate: any,
  policy: DeterministicPolicyResult,
  currentProposal: any,
): ValidatedAdjustmentConversationTurn {
  const requestedActionId = String(
    candidate?.conversation_action_id ?? '',
  ).trim()

  const coachReply = cleanCoachReply(
    candidate?.coach_reply,
  )

  if (requestedActionId === KEEP_CURRENT_ACTION_ID) {
    const currentAction = findLegalAction(
      policy,
      String(currentProposal?.action_id ?? ''),
    )

    if (!currentAction) {
      throw new Error(
        'BB conversation cannot preserve a proposal action that current deterministic policy no longer marks legal.',
      )
    }

    if (
      !proposalMatchesPolicyAction(
        currentProposal,
        currentAction,
      )
    ) {
      throw new Error(
        'BB conversation cannot preserve a proposal whose frozen prescription no longer matches current deterministic policy.',
      )
    }

    return {
      selected_action: null,
      should_revise: false,
      coach_reply: coachReply,
    }
  }

  const selectedAction = findLegalAction(
    policy,
    requestedActionId,
  )

  if (!selectedAction) {
    throw new Error(
      'BB conversation selected an action that deterministic policy did not mark legal.',
    )
  }

  // A model can redundantly choose the already-frozen action while
  // explaining it. Canonicalize that to a no-revision turn so we do
  // not manufacture meaningless proposal history.
  if (
    selectedAction.action_id ===
    String(currentProposal?.action_id ?? '')
  ) {
    if (
      proposalMatchesPolicyAction(
        currentProposal,
        selectedAction,
      )
    ) {
      return {
        selected_action: null,
        should_revise: false,
        coach_reply: coachReply,
      }
    }

    // The action ID may still be legal while deterministic math or
    // another canonical prescription field changed under a newer
    // policy version. Create a real revision so the frozen proposal
    // catches up to current deterministic output.
    return {
      selected_action: selectedAction,
      should_revise: true,
      coach_reply: coachReply,
    }
  }

  return {
    selected_action: selectedAction,
    should_revise: true,
    coach_reply: coachReply,
  }
}
