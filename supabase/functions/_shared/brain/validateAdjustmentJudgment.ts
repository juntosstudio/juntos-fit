import type {
  AdjustmentJudgmentConfidence,
  ValidatedAdjustmentJudgment,
} from './judgmentTypes.ts'
import type {
  DeterministicPolicyResult,
  PolicyActionCandidate,
  PolicyActionId,
} from './policyTypes.ts'

const CONFIDENCE = new Set<AdjustmentJudgmentConfidence>([
  'high',
  'medium',
  'low',
])

function cleanExplanation(value: unknown) {
  const text = String(value ?? '').trim()

  if (!text) {
    throw new Error(
      'BB judgment is missing user_explanation.',
    )
  }

  if (text.length > 2000) {
    throw new Error(
      'BB judgment user_explanation is too long.',
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

export function validateAdjustmentJudgment(
  candidate: any,
  policy: DeterministicPolicyResult,
): ValidatedAdjustmentJudgment {
  const actionId = String(
    candidate?.selected_action_id ?? '',
  ).trim() as PolicyActionId

  const selectedAction = findLegalAction(
    policy,
    actionId,
  )

  if (!selectedAction) {
    throw new Error(
      'BB judgment selected an action that deterministic policy did not mark legal.',
    )
  }

  const confidence = String(
    candidate?.decision_confidence ?? '',
  ) as AdjustmentJudgmentConfidence

  if (!CONFIDENCE.has(confidence)) {
    throw new Error(
      'BB judgment returned an invalid decision confidence.',
    )
  }

  return {
    // The canonical action object comes from deterministic policy,
    // never from model output. This preserves code-owned math,
    // reason codes, and the exact proposed prescription.
    selected_action: selectedAction,
    decision_confidence: confidence,
    user_explanation: cleanExplanation(
      candidate?.user_explanation,
    ),
  }
}
