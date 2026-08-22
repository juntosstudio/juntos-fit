import type { AdjustmentConversationContext } from './conversationTypes.ts'
import type { DeterministicPolicyResult } from './policyTypes.ts'
import { toPublicAdjustmentProposal } from './planAdjustmentRepository.ts'

function publicCoachReview(review: any) {
  return {
    assessment: review?.assessment ?? null,
    confidence: review?.confidence ?? null,
    how_your_week_went:
      review?.how_your_week_went ?? null,
    what_im_seeing:
      review?.what_im_seeing ?? null,
    this_weeks_focus:
      review?.this_weeks_focus ?? [],
    watch_items: review?.watch_items ?? [],
  }
}

const MAX_CONTEXT_MESSAGES = 20
const MAX_CONTEXT_CHARACTERS = 18_000

function proposalRevisionLookup(proposals: any[]) {
  return new Map(
    (proposals ?? []).map((proposal) => [
      String(proposal.id),
      Number(proposal.revision_number),
    ]),
  )
}

function trimConversation(messages: any[]) {
  const selected: any[] = []
  let characters = 0

  for (const message of [...(messages ?? [])].reverse()) {
    if (selected.length >= MAX_CONTEXT_MESSAGES) {
      break
    }

    const content = String(message?.content ?? '')

    if (
      selected.length > 0 &&
      characters + content.length >
        MAX_CONTEXT_CHARACTERS
    ) {
      break
    }

    selected.push(message)
    characters += content.length
  }

  return selected.reverse()
}

export function buildAdjustmentConversationContext({
  packet,
  coachReview,
  policy,
  currentProposal,
  proposals,
  messages,
  memory,
}: {
  packet: any
  coachReview: any
  policy: DeterministicPolicyResult
  currentProposal: any
  proposals: any[]
  messages: any[]
  memory: unknown
}): AdjustmentConversationContext {
  const revisions = proposalRevisionLookup(proposals)

  const currentActionId = String(
    currentProposal?.action_id ?? '',
  )
  const currentActionIsLegal =
    policy.legal_actions.some(
      (action) =>
        action.legal &&
        action.action_id === currentActionId,
    )
  const contextMessages = trimConversation(messages)

  return {
    packet,
    coach_review: publicCoachReview(coachReview),
    policy,
    current_proposal:
      toPublicAdjustmentProposal(currentProposal),
    current_proposal_action_is_legal:
      currentActionIsLegal,
    conversation: contextMessages.map((message) => ({
      role: message.role,
      content: String(message.content ?? ''),
      proposal_revision_number: message.proposal_id
        ? revisions.get(String(message.proposal_id)) ?? null
        : null,
    })),
    memory,
  }
}
