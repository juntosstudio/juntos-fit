import {
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getTodayDateKey: vi.fn(
    () => '2026-08-15',
  ),
  addDays: vi.fn(
    () => '2026-08-14',
  ),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: mocks.from,
  },
}))

vi.mock('../utils/dates', () => ({
  getTodayDateKey:
    mocks.getTodayDateKey,
  addDays: mocks.addDays,
}))

import {
  loadTodayDailyCheckIn,
  saveTodayDailyCheckIn,
} from './dailyCheckInService'

function makeQuery({
  data = null,
  error = null,
} = {}) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    upsert: vi.fn(),
    single: vi.fn(),
  }

  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.upsert.mockReturnValue(query)
  query.maybeSingle.mockResolvedValue({
    data,
    error,
  })
  query.single.mockResolvedValue({
    data,
    error,
  })

  return query
}

describe('dailyCheckInService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getTodayDateKey.mockReturnValue(
      '2026-08-15',
    )
    mocks.addDays.mockReturnValue(
      '2026-08-14',
    )
  })

  test('loads only today’s Daily Check-In for the plan', async () => {
    const saved = {
      id: 'daily-1',
      checkin_date: '2026-08-15',
    }
    const query = makeQuery({
      data: saved,
    })
    mocks.from.mockReturnValue(query)

    await expect(
      loadTodayDailyCheckIn('plan-1'),
    ).resolves.toEqual(saved)

    expect(mocks.from).toHaveBeenCalledWith(
      'daily_checkins',
    )
    expect(query.eq).toHaveBeenNthCalledWith(
      1,
      'coaching_plan_id',
      'plan-1',
    )
    expect(query.eq).toHaveBeenNthCalledWith(
      2,
      'checkin_date',
      '2026-08-15',
    )
  })

  test('propagates Daily load errors', async () => {
    const error = new Error('Load failed')
    mocks.from.mockReturnValue(
      makeQuery({ error }),
    )

    await expect(
      loadTodayDailyCheckIn('plan-1'),
    ).rejects.toBe(error)
  })

  test('requires a coaching plan when saving', async () => {
    await expect(
      saveTodayDailyCheckIn({}),
    ).rejects.toThrow(
      'A coaching plan is required.',
    )

    expect(mocks.from).not.toHaveBeenCalled()
  })

  test('rejects accidental writes to another calendar date', async () => {
    await expect(
      saveTodayDailyCheckIn({
        coaching_plan_id: 'plan-1',
        checkin_date: '2026-08-14',
      }),
    ).rejects.toThrow(
      'Only today’s daily check-in may be changed.',
    )

    expect(mocks.from).not.toHaveBeenCalled()
  })

  test('forces checkin_date to today and review_date to yesterday', async () => {
    const saved = {
      id: 'daily-1',
    }
    const query = makeQuery({
      data: saved,
    })
    mocks.from.mockReturnValue(query)

    await expect(
      saveTodayDailyCheckIn({
        coaching_plan_id: 'plan-1',
        morning_weight: 150,
      }),
    ).resolves.toEqual(saved)

    expect(mocks.addDays).toHaveBeenCalledWith(
      '2026-08-15',
      -1,
    )
    expect(query.upsert).toHaveBeenCalledWith(
      {
        coaching_plan_id: 'plan-1',
        morning_weight: 150,
        checkin_date: '2026-08-15',
        review_date: '2026-08-14',
      },
      {
        onConflict:
          'coaching_plan_id,checkin_date',
      },
    )
  })

  test('propagates Daily save errors', async () => {
    const error = new Error('Save failed')
    mocks.from.mockReturnValue(
      makeQuery({ error }),
    )

    await expect(
      saveTodayDailyCheckIn({
        coaching_plan_id: 'plan-1',
      }),
    ).rejects.toBe(error)
  })
})
