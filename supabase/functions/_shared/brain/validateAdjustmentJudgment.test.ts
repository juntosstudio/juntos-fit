import {
  describe,
  expect,
  test,
} from 'vitest'

import { evaluateDeterministicPolicy } from './policyEngine.ts'
import type { DeterministicPolicyInput } from './policyTypes.ts'
import { validateAdjustmentJudgment } from './validateAdjustmentJudgment.ts'

function input(): DeterministicPolicyInput {
  return {
    completed_week_number: 4,
    goal: 'fat_loss',
    target_loss_rate_pct_per_week: 0.75,
    macro_distribution_preference: 'balanced',
    current_prescription: {
      calorie_target: 1700,
      protein_grams: 165,
      carb_grams: 125,
      fat_grams: 60,
      weekly_cardio_target_minutes: 60,
      cardio_intensity_target: 'easy',
      weekly_workout_target: 3,
      daily_water_goal_oz: 80,
      nutrition_ownership: 'juntos_managed',
    },
    current_week: {
      week_number: 4,
      average_weight_lbs: 160,
      weight_readings: 7,
      nutrition_adherence_percent: 95,
      nutrition_coverage_percent: 100,
      waist_inches: 32,
      body_fat_percent: 30,
      body_fat_source: 'scale',
      average_hunger_score: 2,
      sleep_quality: 4,
      energy_level: 4,
      recovery_score: 4,
      stress_level: 2,
      cardio_minutes: 60,
    },
    previous_week: {
      week_number: 3,
      average_weight_lbs: 160.5,
      weight_readings: 7,
      nutrition_adherence_percent: 95,
      nutrition_coverage_percent: 100,
      waist_inches: 32,
      body_fat_percent: 30,
      body_fat_source: 'scale',
      average_hunger_score: 2,
      sleep_quality: 4,
      energy_level: 4,
      recovery_score: 4,
      stress_level: 2,
      cardio_minutes: 60,
    },
    recent_weeks: [],
    history: {
      full_weeks_under_current_prescription: 2,
      continuous_deficit_weeks: 6,
      prior_calorie_reductions: 1,
    },
    minimum_fat_grams: 45,
  }
}

describe('BB adjustment judgment validation', () => {
  test('accepts a legal action and returns the canonical deterministic candidate', () => {
    const policy = evaluateDeterministicPolicy(input())
    const legalChange = policy.legal_actions.find(
      (action) => action.action_id !== 'hold',
    )

    expect(legalChange).toBeTruthy()

    const result = validateAdjustmentJudgment(
      {
        selected_action_id: legalChange!.action_id,
        decision_confidence: 'high',
        user_explanation:
          'Progress is slower than expected and your adherence is strong, so a small adjustment is reasonable.',
        proposed_calorie_target: 900,
      },
      policy,
    )

    expect(result.selected_action).toBe(legalChange)
    expect(
      result.selected_action.proposed_prescription,
    ).toEqual(legalChange!.proposed_prescription)
    expect(result.decision_confidence).toBe('high')
  })

  test('rejects an action that is blocked even when the model names a real policy action id', () => {
    const policy = evaluateDeterministicPolicy({
      ...input(),
      history: {
        ...input().history,
        full_weeks_under_current_prescription: 0,
      },
    })

    const blocked = policy.blocked_actions.find(
      (action) => action.action_id !== 'hold',
    )

    expect(blocked).toBeTruthy()

    expect(() =>
      validateAdjustmentJudgment(
        {
          selected_action_id: blocked!.action_id,
          decision_confidence: 'high',
          user_explanation: 'Change it.',
        },
        policy,
      ),
    ).toThrow(/did not mark legal/i)
  })

  test('rejects invented action ids', () => {
    const policy = evaluateDeterministicPolicy(input())

    expect(() =>
      validateAdjustmentJudgment(
        {
          selected_action_id: 'cut_500_calories',
          decision_confidence: 'high',
          user_explanation: 'Nope.',
        },
        policy,
      ),
    ).toThrow(/did not mark legal/i)
  })

  test('rejects invalid decision confidence', () => {
    const policy = evaluateDeterministicPolicy(input())

    expect(() =>
      validateAdjustmentJudgment(
        {
          selected_action_id: 'hold',
          decision_confidence: 'absolutely',
          user_explanation:
            'Staying here is the best move for now.',
        },
        policy,
      ),
    ).toThrow(/invalid decision confidence/i)
  })

  test('rejects missing and overlong explanations', () => {
    const policy = evaluateDeterministicPolicy(input())

    expect(() =>
      validateAdjustmentJudgment(
        {
          selected_action_id: 'hold',
          decision_confidence: 'medium',
          user_explanation: '   ',
        },
        policy,
      ),
    ).toThrow(/missing user_explanation/i)

    expect(() =>
      validateAdjustmentJudgment(
        {
          selected_action_id: 'hold',
          decision_confidence: 'medium',
          user_explanation: 'x'.repeat(2001),
        },
        policy,
      ),
    ).toThrow(/too long/i)
  })
})
