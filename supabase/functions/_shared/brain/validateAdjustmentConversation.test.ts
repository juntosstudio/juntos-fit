import { describe, expect, test } from 'vitest'
import { validateAdjustmentConversationTurn } from './validateAdjustmentConversation.ts'

function prescription(calories = 1700) {
  return {
    calorie_target: calories,
    protein_grams: 165,
    carb_grams: calories === 1600 ? 100 : 125,
    fat_grams: 60,
    weekly_cardio_target_minutes: 60,
    cardio_intensity_target: 'easy',
    nutrition_ownership: 'juntos_managed',
  }
}

function frozenProposal(actionId = 'hold', calories = 1700) {
  const p = prescription(calories)

  return {
    action_id: actionId,
    decision_type:
      actionId === 'hold' ? 'hold' : 'recommend_change',
    proposed_calorie_target: p.calorie_target,
    proposed_protein_grams: p.protein_grams,
    proposed_carb_grams: p.carb_grams,
    proposed_fat_grams: p.fat_grams,
    proposed_weekly_cardio_target_minutes:
      p.weekly_cardio_target_minutes,
    proposed_weekly_workout_target:
      p.weekly_workout_target ?? null,
    proposed_daily_water_goal_oz:
      p.daily_water_goal_oz ?? null,
    proposed_cardio_intensity_target:
      p.cardio_intensity_target,
    proposed_nutrition_ownership:
      p.nutrition_ownership,
  }
}

function policy() {
  return {
    policy_version: 'policy-v1',
    rules_version: 'rules-v1',
    contract_version: 'contract-v1',
    legal_actions: [
      {
        action_id: 'hold',
        category: 'hold',
        decision_type: 'hold',
        legal: true,
        reason_codes: ['HOLD_ALWAYS_LEGAL'],
        blocker_codes: [],
        proposed_prescription: prescription(),
      },
      {
        action_id: 'nutrition_decrease_100',
        category: 'nutrition',
        decision_type: 'recommend_change',
        legal: true,
        reason_codes: ['MACRO_ADJUSTMENT_AVAILABLE'],
        blocker_codes: [],
        proposed_prescription: prescription(1600),
      },
    ],
    blocked_actions: [
      {
        action_id: 'cardio_increase_60_to_75',
        category: 'cardio',
        decision_type: 'recommend_change',
        legal: false,
        reason_codes: [],
        blocker_codes: ['CARDIO_TARGET_NOT_MET'],
        proposed_prescription: null,
      },
    ],
    constraints: [],
    signals: {},
    calorie_reset: {},
    completed_week_number: 3,
  } as any
}

describe('validateAdjustmentConversationTurn', () => {
  test('keeps the current proposal for an explanation turn', () => {
    const result = validateAdjustmentConversationTurn(
      {
        conversation_action_id: 'keep_current',
        coach_reply: 'Your trend is still moving in the right direction.',
      },
      policy(),
      frozenProposal('hold'),
    )

    expect(result.should_revise).toBe(false)
    expect(result.selected_action).toBeNull()
  })

  test('maps a revision to the canonical deterministic legal action', () => {
    const result = validateAdjustmentConversationTurn(
      {
        conversation_action_id:
          'nutrition_decrease_100',
        coach_reply:
          'That fits your preference, so I would use the small nutrition change instead.',
        proposed_calorie_target: 900,
      },
      policy(),
      frozenProposal('hold'),
    )

    expect(result.should_revise).toBe(true)
    expect(result.selected_action?.action_id).toBe(
      'nutrition_decrease_100',
    )
    expect(
      result.selected_action?.proposed_prescription
        ?.calorie_target,
    ).toBe(1600)
  })

  test('rejects a blocked action', () => {
    expect(() =>
      validateAdjustmentConversationTurn(
        {
          conversation_action_id:
            'cardio_increase_60_to_75',
          coach_reply: 'Let us add cardio.',
        },
        policy(),
        frozenProposal('hold'),
      ),
    ).toThrow(/did not mark legal/i)
  })

  test('rejects an invented action', () => {
    expect(() =>
      validateAdjustmentConversationTurn(
        {
          conversation_action_id:
            'nutrition_decrease_500',
          coach_reply: 'Let us get aggressive.',
        },
        policy(),
        frozenProposal('hold'),
      ),
    ).toThrow(/did not mark legal/i)
  })

  test('does not create a duplicate revision when model chooses current action', () => {
    const result = validateAdjustmentConversationTurn(
      {
        conversation_action_id:
          'nutrition_decrease_100',
        coach_reply:
          'I would keep the recommendation as written.',
      },
      policy(),
      frozenProposal('nutrition_decrease_100', 1600),
    )

    expect(result.should_revise).toBe(false)
    expect(result.selected_action).toBeNull()
  })

  test('does not preserve a stale proposal action that is no longer legal', () => {
    expect(() =>
      validateAdjustmentConversationTurn(
        {
          conversation_action_id: 'keep_current',
          coach_reply: 'Let us keep it.',
        },
        policy(),
        { action_id: 'cardio_increase_60_to_75' },
      ),
    ).toThrow(/no longer marks legal/i)
  })

  test('requires a non-empty coach reply', () => {
    expect(() =>
      validateAdjustmentConversationTurn(
        {
          conversation_action_id: 'keep_current',
          coach_reply: '   ',
        },
        policy(),
        frozenProposal('hold'),
      ),
    ).toThrow(/missing coach_reply/i)
  })
})

describe('proposal prescription freshness', () => {
  test('does not preserve the same action id when canonical deterministic math changed', () => {
    expect(() =>
      validateAdjustmentConversationTurn(
        {
          conversation_action_id: 'keep_current',
          coach_reply: 'Let us keep it.',
        },
        policy(),
        {
          action_id: 'nutrition_decrease_100',
          decision_type: 'recommend_change',
          proposed_calorie_target: 1590,
          proposed_protein_grams: 165,
          proposed_carb_grams: 98,
          proposed_fat_grams: 60,
          proposed_weekly_cardio_target_minutes: 60,
          proposed_cardio_intensity_target: 'easy',
          proposed_nutrition_ownership: 'juntos_managed',
        },
      ),
    ).toThrow(/frozen prescription/i)
  })

  test('creates a revision when the same action id now maps to different canonical values', () => {
    const result = validateAdjustmentConversationTurn(
      {
        conversation_action_id:
          'nutrition_decrease_100',
        coach_reply:
          'I would keep the same direction using the current prescription math.',
      },
      policy(),
      {
        action_id: 'nutrition_decrease_100',
        decision_type: 'recommend_change',
        proposed_calorie_target: 1590,
        proposed_protein_grams: 165,
        proposed_carb_grams: 98,
        proposed_fat_grams: 60,
        proposed_weekly_cardio_target_minutes: 60,
        proposed_cardio_intensity_target: 'easy',
        proposed_nutrition_ownership: 'juntos_managed',
      },
    )

    expect(result.should_revise).toBe(true)
    expect(result.selected_action?.action_id).toBe(
      'nutrition_decrease_100',
    )
    expect(
      result.selected_action?.proposed_prescription
        ?.calorie_target,
    ).toBe(1600)
  })
})
