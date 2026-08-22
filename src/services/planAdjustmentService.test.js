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

beforeEach(() => {
  vi.clearAllMocks()
})

describe('planAdjustmentService', () => {
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

describe('Plan Adjustment conversation service', () => {
  test('loads conversation messages in chronological order', async () => {
    const rows = [
      {
        id: 'message-1',
        role: 'user',
        content: 'Why hold?',
      },
      {
        id: 'message-2',
        role: 'coach',
        content: 'Because the trend is still useful.',
      },
    ]

    const orderId = vi.fn().mockResolvedValue({
      data: rows,
      error: null,
    })
    const orderCreated = vi.fn(() => ({
      order: orderId,
    }))
    const eq = vi.fn(() => ({
      order: orderCreated,
    }))
    const select = vi.fn(() => ({ eq }))
    mocks.from.mockReturnValue({ select })

    const { loadPlanAdjustmentConversation } =
      await import('./planAdjustmentService.js')

    await expect(
      loadPlanAdjustmentConversation('weekly-1'),
    ).resolves.toEqual(rows)

    expect(mocks.from).toHaveBeenCalledWith(
      'coaching_adjustment_messages',
    )
    expect(select).toHaveBeenCalledWith(
      expect.stringContaining(
        'client_message_id',
      ),
    )
  })

  test('sends the client message id with the discussion turn', async () => {
    mocks.invoke.mockResolvedValue({
      data: {
        proposal: { id: 'proposal-2' },
        message: { id: 'message-2' },
        revised: true,
        cached: false,
      },
      error: null,
    })

    const { sendPlanAdjustmentMessage } =
      await import('./planAdjustmentService.js')

    const result = await sendPlanAdjustmentMessage({
      weeklyCheckInId: 'weekly-1',
      message: '  I would rather add cardio.  ',
      clientMessageId:
        '11111111-1111-4111-8111-111111111111',
    })

    expect(result.revised).toBe(true)
    expect(
      mocks.invoke,
    ).toHaveBeenCalledWith(
      'continue-plan-adjustment',
      {
        body: {
          weekly_checkin_id: 'weekly-1',
          message: 'I would rather add cardio.',
          client_message_id:
            '11111111-1111-4111-8111-111111111111',
        },
      },
    )
  })

  test('requires the caller to preserve a client message id for safe retries', async () => {
    const { sendPlanAdjustmentMessage } =
      await import('./planAdjustmentService.js')

    await expect(
      sendPlanAdjustmentMessage({
        weeklyCheckInId: 'weekly-1',
        message: 'Why?',
        clientMessageId: '',
      }),
    ).rejects.toThrow(/client message id/i)
  })
})

describe('Plan Adjustment resolution service', () => {
  test('accepts only by proposal id and explicit accept command', async () => {
    mocks.invoke.mockResolvedValue({
      data: {
        outcome: 'accepted',
        proposal: {
          id: 'proposal-1',
          status: 'accepted',
        },
        applied_target: {
          id: 'target-2',
          calorie_target: 1600,
        },
      },
      error: null,
    })

    const { acceptPlanAdjustment } =
      await import('./planAdjustmentService.js')

    const result = await acceptPlanAdjustment(
      'proposal-1',
    )

    expect(result.outcome).toBe('accepted')
    expect(mocks.invoke).toHaveBeenCalledWith(
      'resolve-plan-adjustment',
      {
        body: {
          proposal_id: 'proposal-1',
          resolution: 'accept',
        },
      },
    )
  })

  test('decline invokes the same deterministic resolution boundary without prescription values', async () => {
    mocks.invoke.mockResolvedValue({
      data: {
        outcome: 'declined',
        proposal: {
          id: 'proposal-1',
          status: 'declined',
        },
        applied_target: null,
      },
      error: null,
    })

    const { declinePlanAdjustment } =
      await import('./planAdjustmentService.js')

    await declinePlanAdjustment('proposal-1')

    expect(mocks.invoke).toHaveBeenCalledWith(
      'resolve-plan-adjustment',
      {
        body: {
          proposal_id: 'proposal-1',
          resolution: 'decline',
        },
      },
    )
  })

  test('rejects invalid resolution commands before invoking', async () => {
    const { resolvePlanAdjustment } =
      await import('./planAdjustmentService.js')

    await expect(
      resolvePlanAdjustment({
        proposalId: 'proposal-1',
        resolution: 'maybe',
      }),
    ).rejects.toThrow(/accept or decline/i)

    expect(mocks.invoke).not.toHaveBeenCalled()
  })

  test('surfaces stale-policy resolution messages from the server', async () => {
    mocks.invoke.mockResolvedValue({
      data: null,
      error: {
        context: {
          json: vi.fn().mockResolvedValue({
            error:
              'This Plan Adjustment no longer exactly matches current deterministic policy.',
          }),
        },
      },
    })

    const { acceptPlanAdjustment } =
      await import('./planAdjustmentService.js')

    await expect(
      acceptPlanAdjustment('proposal-1'),
    ).rejects.toThrow(/no longer exactly matches/i)
  })
})
