import { describe, expect, test } from 'vitest'
import { proposalMatchesPolicyAction } from './proposalPolicyMatch.ts'

function action() {
  return {
    action_id: 'nutrition_decrease_100',
    category: 'nutrition',
    decision_type: 'recommend_change',
    legal: true,
    reason_codes: ['MACRO_ADJUSTMENT_AVAILABLE'],
    blocker_codes: [],
    proposed_prescription: {
      calorie_target: 1600,
      protein_grams: 165,
      carb_grams: 100,
      fat_grams: 60,
      weekly_cardio_target_minutes: 60,
      weekly_workout_target: 3,
      daily_water_goal_oz: 80,
      cardio_intensity_target: 'easy',
      nutrition_ownership: 'juntos_managed',
    },
  } as any
}

function proposal() {
  return {
    action_id: 'nutrition_decrease_100',
    decision_type: 'recommend_change',
    proposed_calorie_target: 1600,
    proposed_protein_grams: 165,
    proposed_carb_grams: 100,
    proposed_fat_grams: 60,
    proposed_weekly_cardio_target_minutes: 60,
    proposed_weekly_workout_target: 3,
    proposed_daily_water_goal_oz: 80,
    proposed_cardio_intensity_target: 'easy',
    proposed_nutrition_ownership: 'juntos_managed',
  }
}

describe('proposalMatchesPolicyAction', () => {
  test('requires an exact canonical prescription match', () => {
    expect(
      proposalMatchesPolicyAction(
        proposal(),
        action(),
      ),
    ).toBe(true)
  })

  test('rejects the same action id when deterministic macro math changed', () => {
    expect(
      proposalMatchesPolicyAction(
        {
          ...proposal(),
          proposed_carb_grams: 99,
        },
        action(),
      ),
    ).toBe(false)
  })

  test('rejects an action that is no longer legal', () => {
    expect(
      proposalMatchesPolicyAction(
        proposal(),
        {
          ...action(),
          legal: false,
        },
      ),
    ).toBe(false)
  })

  test('treats optional missing prescription fields as canonical nulls', () => {
    const legalAction = action()
    delete legalAction.proposed_prescription
      .weekly_workout_target
    delete legalAction.proposed_prescription
      .daily_water_goal_oz

    const frozen = proposal()
    frozen.proposed_weekly_workout_target = null
    frozen.proposed_daily_water_goal_oz = null

    expect(
      proposalMatchesPolicyAction(
        frozen,
        legalAction,
      ),
    ).toBe(true)
  })
})
