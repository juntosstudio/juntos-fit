import {
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: mocks.rpc,
  },
}))

import {
  createCoachingPlan,
} from './createPlanService'

describe('createPlanService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('requires a signed-in user', async () => {
    await expect(
      createCoachingPlan(null, {}),
    ).rejects.toThrow(
      'You must be signed in to create a plan.',
    )

    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  test('calls the plan-creation RPC with normalized numeric values', async () => {
    mocks.rpc.mockResolvedValue({
      data: 'plan-123',
      error: null,
    })

    const planId =
      await createCoachingPlan(
        'user-1',
        {
          start_date: '2026-08-16',
          checkin_day: '0',
          program_length_weeks: '12',
          goal: 'fat_loss',
          body_fat_source: 'none',
          unit_system: 'imperial',
          time_zone: 'America/Chicago',
          measurement_frequency_weeks: '1',
          photo_frequency_weeks: '4',
          calorie_target: '1700',
          protein_grams: '165',
          carb_grams: '125',
          fat_grams: '60',
          weekly_cardio_target_minutes: '90',
          weekly_workout_target: '3',
          daily_water_goal_oz: '80',
        },
      )

    expect(mocks.rpc).toHaveBeenCalledWith(
      'create_coaching_plan_with_targets',
      {
        p_start_date: '2026-08-16',
        p_checkin_day: 0,
        p_program_length_weeks: 12,
        p_goal: 'fat_loss',
        p_body_fat_source: 'none',
        p_unit_system: 'imperial',
        p_time_zone: 'America/Chicago',
        p_measurement_frequency_weeks: 1,
        p_photo_frequency_weeks: 4,
        p_calorie_target: 1700,
        p_protein_grams: 165,
        p_carb_grams: 125,
        p_fat_grams: 60,
        p_weekly_cardio_target_minutes: 90,
        p_weekly_workout_target: 3,
        p_daily_water_goal_oz: 80,
      },
    )

    expect(planId).toBe('plan-123')
  })

  test('propagates an RPC error', async () => {
    const error = new Error('RPC failed')

    mocks.rpc.mockResolvedValue({
      data: null,
      error,
    })

    await expect(
      createCoachingPlan(
        'user-1',
        {
          start_date: '2026-08-16',
        },
      ),
    ).rejects.toBe(error)
  })
})
