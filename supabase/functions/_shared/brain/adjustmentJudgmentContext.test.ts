import {
  describe,
  expect,
  test,
} from 'vitest'

import { buildAdjustmentJudgmentContext } from './adjustmentJudgmentContext.ts'
import { evaluateDeterministicPolicy } from './policyEngine.ts'
import type { DeterministicPolicyInput } from './policyTypes.ts'

function policy() {
  const input: DeterministicPolicyInput = {
    completed_week_number: 1,
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
      nutrition_ownership: 'juntos_managed',
    },
    current_week: {
      week_number: 1,
      average_weight_lbs: 160,
      weight_readings: 7,
      nutrition_adherence_percent: 95,
      nutrition_coverage_percent: 100,
      waist_inches: 32,
      cardio_minutes: 60,
    },
    previous_week: null,
    recent_weeks: [],
    history: {
      full_weeks_under_current_prescription: 1,
      continuous_deficit_weeks: 1,
      prior_calorie_reductions: 0,
    },
  }

  return evaluateDeterministicPolicy(input)
}

describe('adjustment judgment context', () => {
  test('keeps review interpretation but strips Brain Lite hard-coded HOLD action', () => {
    const context = buildAdjustmentJudgmentContext({
      packet: { current_week: { week_number: 1 } },
      coachReview: {
        assessment: 'on_track',
        confidence: 'high',
        how_your_week_went: 'Good week.',
        what_im_seeing: 'Progress is steady.',
        this_weeks_focus: ['Keep going.'],
        watch_items: [],
        prescription_action: 'hold',
        input_hash: 'private-internal-field',
      },
      policy: policy(),
      memory: { recent_context: [] },
    })

    expect(context.coach_review).toEqual({
      assessment: 'on_track',
      confidence: 'high',
      how_your_week_went: 'Good week.',
      what_im_seeing: 'Progress is steady.',
      this_weeks_focus: ['Keep going.'],
      watch_items: [],
    })

    expect(
      'prescription_action' in context.coach_review,
    ).toBe(false)
    expect(context.policy.legal_actions.length).toBeGreaterThan(0)
  })
})
