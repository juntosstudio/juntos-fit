import type {
  DataConfidence,
  HardRulesResult,
} from './types.ts'

export const HARD_RULES_VERSION =
  'juntos_hard_rules_v0.1'

function resolveConfidence(packet: any): DataConfidence {
  const daysReported = Number(
    packet?.current_week?.behavior?.days_reported ?? 0,
  )

  if (daysReported >= 6) {
    return 'high'
  }

  if (daysReported >= 4) {
    return 'medium'
  }

  return 'low'
}

export function evaluateHardRules(
  packet: any,
): HardRulesResult {
  return {
    version: HARD_RULES_VERSION,
    data_confidence:
      resolveConfidence(packet),
    prescription_actions_allowed: [
      'hold',
    ],
    constraints: [
      'The AI may assess and explain, but it may not write or modify a prescription.',
      'Brain Lite v0.1 permits only the HOLD prescription action.',
      'Incomplete or missing historical weeks cannot be treated as plateau evidence.',
      'Estimated body fat is a supporting trend signal only.',
      'Missing data must remain missing; the AI may not infer or fabricate it.',
      'The review must be based only on the completed program week and earlier history; later-week data is excluded.',
      'Medical diagnosis and treatment instructions are outside this review.',
    ],
  }
}
