import type {
  DeterministicPolicyResult,
  PolicyActionCandidate,
  PolicyActionId,
} from './policyTypes.ts'

export const KEEP_CURRENT_ACTION_ID =
  'keep_current' as const

export type ConversationActionId =
  | typeof KEEP_CURRENT_ACTION_ID
  | PolicyActionId

export interface AdjustmentConversationOutput {
  conversation_action_id: ConversationActionId
  coach_reply: string
}

export interface ValidatedAdjustmentConversationTurn {
  selected_action: PolicyActionCandidate | null
  should_revise: boolean
  coach_reply: string
}

export interface AdjustmentConversationProtocol {
  version: string
  name: string
  purpose: string
  principles: string[]
  tone: string[]
}

export interface AdjustmentConversationContext {
  packet: any
  coach_review: any
  policy: DeterministicPolicyResult
  current_proposal: any
  current_proposal_action_is_legal: boolean
  conversation: Array<{
    role: 'user' | 'coach' | 'system'
    content: string
    proposal_revision_number: number | null
  }>
  memory: unknown
}
