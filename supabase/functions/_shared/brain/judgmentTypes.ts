import type {
  DeterministicPolicyResult,
  PolicyActionCandidate,
  PolicyActionId,
} from './policyTypes.ts'

export type AdjustmentJudgmentConfidence =
  | 'high'
  | 'medium'
  | 'low'

export interface AdjustmentJudgmentOutput {
  selected_action_id: PolicyActionId
  decision_confidence: AdjustmentJudgmentConfidence
  user_explanation: string
}

export interface ValidatedAdjustmentJudgment {
  selected_action: PolicyActionCandidate
  decision_confidence: AdjustmentJudgmentConfidence
  user_explanation: string
}

export interface AdjustmentJudgmentProtocol {
  version: string
  name: string
  purpose: string
  principles: string[]
  tone: string[]
}

export interface AdjustmentJudgmentContext {
  packet: any
  coach_review: any
  policy: DeterministicPolicyResult
  memory: unknown
}
