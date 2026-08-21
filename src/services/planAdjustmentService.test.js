import {
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  invoke: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: mocks.from,
    functions: {
      invoke: mocks.invoke,
    },
  },
}))

import {
  generatePlanAdjustment,
  loadLatestPlanAdjustment,
} from './planAdjustmentService'

function makeQuery({
  data = null,
  error = null,
} = {}) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(),
  }

  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.order.mockReturnValue(query)
  query.limit.mockReturnValue(query)
  query.maybeSingle.mockResolvedValue({
    data,
    error,
  })

  return query
}

describe('planAdjustmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns null without querying when weeklyCheckInId is missing', async () => {
    await expect(
      loadLatestPlanAdjustment(null),
    ).resolves.toBeNull()

    expect(mocks.from).not.toHaveBeenCalled()
  })

  test('loads the latest proposal and exposes a nested prescription', async () => {
    const query = makeQuery({
      data: {
        id: 'proposal-1',
        weekly_checkin_id: 'week-1',
        revision_number: 2,
        action_id: 'nutrition_decrease_100',
        proposed_calorie_target: 1600,
        proposed_protein_grams: 165,
        proposed_carb_grams: 100,
        proposed_fat_grams: 60,
        proposed_weekly_cardio_target_minutes: 60,
        proposed_weekly_workout_target: 3,
        proposed_daily_water_goal_oz: 80,
        proposed_cardio_intensity_target: 'easy',
        proposed_nutrition_ownership: 'juntos_managed',
      },
    })

    mocks.from.mockReturnValue(query)

    const result =
      await loadLatestPlanAdjustment('week-1')

    expect(mocks.from).toHaveBeenCalledWith(
      'coaching_adjustment_proposals',
    )
    expect(query.eq).toHaveBeenCalledWith(
      'weekly_checkin_id',
      'week-1',
    )
    expect(query.order).toHaveBeenCalledWith(
      'revision_number',
      { ascending: false },
    )
    expect(result).toMatchObject({
      id: 'proposal-1',
      proposed_prescription: {
        calorie_target: 1600,
        protein_grams: 165,
        carb_grams: 100,
        fat_grams: 60,
      },
    })
  })

  test('invokes the server-side Plan Adjustment function', async () => {
    mocks.invoke.mockResolvedValue({
      data: {
        proposal: {
          id: 'proposal-1',
          action_id: 'hold',
        },
      },
      error: null,
    })

    await expect(
      generatePlanAdjustment('week-1'),
    ).resolves.toEqual({
      id: 'proposal-1',
      action_id: 'hold',
    })

    expect(mocks.invoke).toHaveBeenCalledWith(
      'generate-plan-adjustment',
      {
        body: {
          weekly_checkin_id: 'week-1',
        },
      },
    )
  })

  test('requires a completed Weekly Check-In id before invoking', async () => {
    await expect(
      generatePlanAdjustment(null),
    ).rejects.toThrow(
      'A completed Weekly Check-In is required.',
    )

    expect(mocks.invoke).not.toHaveBeenCalled()
  })

  test('surfaces a safe function error message', async () => {
    mocks.invoke.mockResolvedValue({
      data: null,
      error: {
        context: {
          json: vi.fn().mockResolvedValue({
            error:
              'Complete the Coach Review before starting Plan Adjustment.',
          }),
        },
      },
    })

    await expect(
      generatePlanAdjustment('week-1'),
    ).rejects.toThrow(
      'Complete the Coach Review before starting Plan Adjustment.',
    )
  })
})
