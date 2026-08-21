import {
  describe,
  expect,
  test,
} from 'vitest'

import {
  addDateKeyDays,
  resolveBasedOnTargetId,
  resolveProposalEffectiveDate,
  toPublicAdjustmentProposal,
} from './planAdjustmentRepository.ts'

describe('Plan Adjustment repository helpers', () => {
  test('sets the proposal effective date to the next plan week start', () => {
    expect(
      resolveProposalEffectiveDate({
        current_week: {
          week_range: {
            end: '2026-08-22',
          },
        },
      }),
    ).toBe('2026-08-23')

    expect(addDateKeyDays('2026-12-31', 1)).toBe(
      '2027-01-01',
    )
  })

  test('uses the last prescription segment as the base target for a split week', () => {
    expect(
      resolveBasedOnTargetId({
        current_week: {
          prescription: [
            { source_target_id: 'target-old' },
            { source_target_id: 'target-new' },
          ],
        },
      }),
    ).toBe('target-new')
  })

  test('falls back to target history when a frozen segment lacks a source target id', () => {
    expect(
      resolveBasedOnTargetId({
        current_week: {
          prescription: [
            { source_target_id: null },
          ],
        },
        prescription_history: [
          { id: 'target-a' },
          { id: 'target-b' },
        ],
      }),
    ).toBe('target-b')
  })

  test('returns a stable public proposal shape with nested prescription', () => {
    expect(
      toPublicAdjustmentProposal({
        id: 'proposal-1',
        coaching_plan_id: 'plan-1',
        weekly_checkin_id: 'week-1',
        weekly_coach_review_id: 'review-1',
        based_on_target_id: 'target-1',
        revision_number: 1,
        supersedes_proposal_id: null,
        decision_type: 'recommend_change',
        action_id: 'nutrition_decrease_100',
        status: 'proposed',
        proposed_calorie_target: 1600,
        proposed_protein_grams: 165,
        proposed_carb_grams: 100,
        proposed_fat_grams: 60,
        proposed_weekly_cardio_target_minutes: 60,
        proposed_weekly_workout_target: 3,
        proposed_daily_water_goal_oz: 80,
        proposed_cardio_intensity_target: 'easy',
        proposed_nutrition_ownership: 'juntos_managed',
        proposed_effective_date: '2026-08-23',
        reason_codes: ['PACE_SLOW_50_TO_74'],
        user_explanation: 'Small change.',
        policy_version: 'policy-v1',
        rules_version: 'rules-v1',
        contract_version: 'contract-v1',
      }),
    ).toMatchObject({
      id: 'proposal-1',
      action_id: 'nutrition_decrease_100',
      proposed_prescription: {
        calorie_target: 1600,
        protein_grams: 165,
        carb_grams: 100,
        fat_grams: 60,
      },
    })
  })
})
