import { describe, expect, test } from 'vitest'
import { buildAdjustmentConversationContext } from './conversationContext.ts'

function policy() {
  return {
    policy_version: 'policy-v1',
    rules_version: 'rules-v1',
    contract_version: 'contract-v1',
    legal_actions: [],
    blocked_actions: [],
    constraints: [],
    signals: {},
    calorie_reset: {},
    completed_week_number: 3,
  } as any
}

describe('buildAdjustmentConversationContext', () => {
  test('omits Brain Lite action and annotates transcript with proposal revision', () => {
    const context = buildAdjustmentConversationContext({
      packet: { current_week: { week_number: 3 } },
      coachReview: {
        assessment: 'on_track',
        prescription_action: 'hold',
        how_your_week_went: 'Solid week.',
      },
      policy: policy(),
      currentProposal: {
        id: 'proposal-2',
        action_id: 'hold',
        revision_number: 2,
      },
      proposals: [
        { id: 'proposal-1', revision_number: 1 },
        { id: 'proposal-2', revision_number: 2 },
      ],
      messages: [
        {
          role: 'user',
          content: 'Could we do cardio instead?',
          proposal_id: 'proposal-1',
        },
        {
          role: 'coach',
          content: 'Yes, that is a legal option.',
          proposal_id: 'proposal-2',
        },
      ],
      memory: [],
    })

    expect(
      context.coach_review.prescription_action,
    ).toBeUndefined()
    expect(context.conversation).toEqual([
      {
        role: 'user',
        content: 'Could we do cardio instead?',
        proposal_revision_number: 1,
      },
      {
        role: 'coach',
        content: 'Yes, that is a legal option.',
        proposal_revision_number: 2,
      },
    ])
  })
})
