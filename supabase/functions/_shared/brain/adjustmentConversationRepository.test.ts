import { describe, expect, test, vi } from 'vitest'
import {
  finalizeAdjustmentConversationTurn,
  toPublicAdjustmentMessage,
} from './adjustmentConversationRepository.ts'

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

function action() {
  return {
    action_id: 'cardio_increase_60_to_75',
    category: 'cardio',
    decision_type: 'recommend_change',
    legal: true,
    reason_codes: ['CARDIO_LADDER_60_TO_75'],
    blocker_codes: [],
    proposed_prescription: {
      calorie_target: 1700,
      protein_grams: 165,
      carb_grams: 125,
      fat_grams: 60,
      weekly_cardio_target_minutes: 75,
      weekly_workout_target: 3,
      daily_water_goal_oz: 80,
      cardio_intensity_target: 'easy',
      nutrition_ownership: 'juntos_managed',
    },
  } as any
}

describe('Adjustment conversation repository', () => {
  test('uses the transactional RPC with only canonical deterministic revision values', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        proposal: {
          id: 'proposal-2',
          revision_number: 2,
          action_id: 'cardio_increase_60_to_75',
          proposed_weekly_cardio_target_minutes: 75,
        },
        message: {
          id: 'coach-message-1',
          role: 'coach',
          content: 'Cardio is the better fit.',
          proposal_id: 'proposal-2',
        },
        revised: true,
        cached: false,
      },
      error: null,
    })

    const result =
      await finalizeAdjustmentConversationTurn({
        admin: { rpc },
        currentProposal: { id: 'proposal-1' },
        userMessage: { id: 'user-message-1' },
        validatedTurn: {
          selected_action: action(),
          should_revise: true,
          coach_reply: 'Cardio is the better fit.',
        },
        policy: policy(),
      })

    expect(rpc).toHaveBeenCalledWith(
      'finalize_coaching_adjustment_turn',
      {
        p_current_proposal_id: 'proposal-1',
        p_user_message_id: 'user-message-1',
        p_coach_reply: 'Cardio is the better fit.',
        p_revision: expect.objectContaining({
          action_id: 'cardio_increase_60_to_75',
          proposed_weekly_cardio_target_minutes: 75,
          policy_version: 'policy-v1',
        }),
      },
    )
    expect(result.revised).toBe(true)
    expect(
      result.proposal.proposed_prescription
        .weekly_cardio_target_minutes,
    ).toBe(75)
  })

  test('passes null revision for an explanation-only turn', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        proposal: {
          id: 'proposal-1',
          revision_number: 1,
          action_id: 'hold',
        },
        message: {
          id: 'coach-message-1',
          role: 'coach',
          content: 'I would still hold.',
          proposal_id: 'proposal-1',
        },
        revised: false,
        cached: false,
      },
      error: null,
    })

    await finalizeAdjustmentConversationTurn({
      admin: { rpc },
      currentProposal: { id: 'proposal-1' },
      userMessage: { id: 'user-message-1' },
      validatedTurn: {
        selected_action: null,
        should_revise: false,
        coach_reply: 'I would still hold.',
      },
      policy: policy(),
    })

    expect(rpc).toHaveBeenCalledWith(
      'finalize_coaching_adjustment_turn',
      expect.objectContaining({
        p_revision: null,
      }),
    )
  })

  test('returns a stable public message shape', () => {
    expect(
      toPublicAdjustmentMessage({
        id: 'message-1',
        coaching_plan_id: 'plan-1',
        weekly_checkin_id: 'week-1',
        proposal_id: 'proposal-1',
        role: 'coach',
        content: 'Still a proposal.',
        in_reply_to_message_id: 'message-0',
        client_message_id: null,
        created_at: '2026-08-21T22:00:00Z',
      }),
    ).toEqual({
      id: 'message-1',
      coaching_plan_id: 'plan-1',
      weekly_checkin_id: 'week-1',
      proposal_id: 'proposal-1',
      role: 'coach',
      content: 'Still a proposal.',
      in_reply_to_message_id: 'message-0',
      created_at: '2026-08-21T22:00:00Z',
    })
  })
})
