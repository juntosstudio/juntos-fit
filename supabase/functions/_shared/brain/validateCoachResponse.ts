import type {
  CoachAssessment,
  CoachReviewOutput,
  HardRulesResult,
} from './types.ts'

const ASSESSMENTS = new Set<CoachAssessment>([
  'on_track',
  'watch',
  'needs_attention',
])

function cleanText(
  value: unknown,
  fieldName: string,
) {
  const text = String(value ?? '').trim()

  if (!text) {
    throw new Error(
      `AI response is missing ${fieldName}.`,
    )
  }

  return text
}

function cleanList(
  value: unknown,
  maximum: number,
) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
    .slice(0, maximum)
}

export function validateCoachResponse(
  candidate: any,
  hardRules: HardRulesResult,
): CoachReviewOutput {
  const assessment = String(
    candidate?.assessment ?? '',
  ) as CoachAssessment

  if (!ASSESSMENTS.has(assessment)) {
    throw new Error(
      'AI response returned an invalid assessment.',
    )
  }

  if (
    candidate?.prescription_action !==
    'hold'
  ) {
    throw new Error(
      'AI response attempted a prescription action that Brain Lite does not allow.',
    )
  }

  if (
    !hardRules.prescription_actions_allowed.includes(
      'hold',
    )
  ) {
    throw new Error(
      'Hard rules do not permit the returned prescription action.',
    )
  }

  const focus = cleanList(
    candidate?.this_weeks_focus,
    3,
  )

  if (focus.length === 0) {
    throw new Error(
      'AI response did not include a weekly focus.',
    )
  }

  return {
    assessment,

    // Confidence is authoritative code-owned state.
    // The model may reason about uncertainty, but it
    // cannot override the deterministic confidence rule.
    confidence:
      hardRules.data_confidence,

    how_your_week_went: cleanText(
      candidate?.how_your_week_went,
      'how_your_week_went',
    ),

    what_im_seeing: cleanText(
      candidate?.what_im_seeing,
      'what_im_seeing',
    ),

    this_weeks_focus: focus,

    watch_items: cleanList(
      candidate?.watch_items,
      2,
    ),

    prescription_action: 'hold',
  }
}
