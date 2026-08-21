import type { AdjustmentJudgmentContext } from './judgmentTypes.ts'
import type { DeterministicPolicyResult } from './policyTypes.ts'

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

export function buildAdjustmentJudgmentContext({
  packet,
  coachReview,
  policy,
  memory,
}: {
  packet: any
  coachReview: any
  policy: DeterministicPolicyResult
  memory: unknown
}): AdjustmentJudgmentContext {
  return {
    packet,

    // Brain Lite's historical prescription_action is intentionally
    // excluded. In v0.1 that field was hard-coded to HOLD and would
    // improperly anchor the actual adjustment judgment.
    coach_review: publicCoachReview(coachReview),

    policy,
    memory,
  }
}
