import { describe, expect, test } from 'vitest'
import {
  isAdjustmentResolution,
  resolveAdjustmentProposal,
  toPublicAppliedTarget,
} from './adjustmentResolutionRepository.ts'

describe('adjustmentResolutionRepository', () => {
  test('accept and decline are the only resolution commands', () => {
    expect(isAdjustmentResolution('accept')).toBe(true)
    expect(isAdjustmentResolution('decline')).toBe(true)
    expect(isAdjustmentResolution('accepted')).toBe(false)
    expect(isAdjustmentResolution('hold')).toBe(false)
    expect(isAdjustmentResolution('')).toBe(false)
  })

  test('normalizes only canonical applied-target fields', () => {
    expect(
      toPublicAppliedTarget({
        id: 'target-1',
        coaching_plan_id: 'plan-1',
        effective_date: '2026-08-23',
        calorie_target: 1600,
        protein_grams: 165,
        carb_grams: 100,
        fat_grams: 60,
        weekly_cardio_target_minutes: 60,
        weekly_workout_target: 3,
        daily_water_goal_oz: 80,
        cardio_intensity_target: 'easy',
        nutrition_ownership: 'juntos_managed',
        prescription_source: 'bb_adjustment',
        created_at: '2026-08-22T00:00:00Z',
        secret: 'do-not-leak',
      }),
    ).toEqual({
      id: 'target-1',
      coaching_plan_id: 'plan-1',
      effective_date: '2026-08-23',
      calorie_target: 1600,
      protein_grams: 165,
      carb_grams: 100,
      fat_grams: 60,
      weekly_cardio_target_minutes: 60,
      weekly_workout_target: 3,
      daily_water_goal_oz: 80,
      cardio_intensity_target: 'easy',
      nutrition_ownership: 'juntos_managed',
      prescription_source: 'bb_adjustment',
      created_at: '2026-08-22T00:00:00Z',
    })
  })

  test('resolution RPC receives only proposal id and explicit command', async () => {
    let capturedName = ''
    let capturedArgs: Record<string, unknown> = {}

    const admin = {
      rpc: async (
        name: string,
        args: Record<string, unknown>,
      ) => {
        capturedName = name
        capturedArgs = args

        return {
          data: {
            outcome: 'accepted',
            cached: false,
            proposal: {
              id: 'proposal-1',
              action_id: 'nutrition_decrease_100',
              status: 'accepted',
              reason_codes: ['SLOW_PROGRESS'],
            },
            applied_target: {
              id: 'target-2',
              coaching_plan_id: 'plan-1',
              effective_date: '2026-08-23',
              calorie_target: 1600,
              prescription_source: 'bb_adjustment',
            },
          },
          error: null,
        }
      },
    }

    const result = await resolveAdjustmentProposal({
      admin,
      proposalId: 'proposal-1',
      resolution: 'accept',
    })

    expect(capturedName).toBe(
      'resolve_coaching_adjustment_proposal',
    )
    expect(capturedArgs).toEqual({
      p_proposal_id: 'proposal-1',
      p_resolution: 'accept',
    })
    expect(result.outcome).toBe('accepted')
    expect(
      result.applied_target?.prescription_source,
    ).toBe('bb_adjustment')
  })

  test('resolution repository surfaces database failures', async () => {
    const admin = {
      rpc: async () => ({
        data: null,
        error: new Error('database failed'),
      }),
    }

    await expect(
      resolveAdjustmentProposal({
        admin,
        proposalId: 'proposal-1',
        resolution: 'decline',
      }),
    ).rejects.toThrow('database failed')
  })
})
