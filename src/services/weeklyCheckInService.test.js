import {
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: mocks.from,
  },
}))

import {
  completeWeeklyCheckIn,
  createWeeklyCheckInDraft,
  loadWeeklyCheckIn,
  saveWeeklyCheckInDraft,
} from './weeklyCheckInService'

function makeQuery({
  maybeData = null,
  maybeError = null,
  singleData = null,
  singleError = null,
} = {}) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    single: vi.fn(),
  }

  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.insert.mockReturnValue(query)
  query.update.mockReturnValue(query)
  query.maybeSingle.mockResolvedValue({
    data: maybeData,
    error: maybeError,
  })
  query.single.mockResolvedValue({
    data: singleData,
    error: singleError,
  })

  return query
}

describe('weeklyCheckInService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns null when load identifiers are incomplete', async () => {
    await expect(
      loadWeeklyCheckIn(null, 1),
    ).resolves.toBeNull()
    await expect(
      loadWeeklyCheckIn('plan-1', null),
    ).resolves.toBeNull()

    expect(mocks.from).not.toHaveBeenCalled()
  })

  test('loads one Weekly Check-In by plan and week number', async () => {
    const data = {
      id: 'weekly-2',
      week_number: 2,
    }
    const query = makeQuery({
      maybeData: data,
    })
    mocks.from.mockReturnValue(query)

    await expect(
      loadWeeklyCheckIn('plan-1', 2),
    ).resolves.toEqual(data)

    expect(query.eq).toHaveBeenNthCalledWith(
      1,
      'coaching_plan_id',
      'plan-1',
    )
    expect(query.eq).toHaveBeenNthCalledWith(
      2,
      'week_number',
      2,
    )
  })

  test('returns an existing draft instead of inserting another one', async () => {
    const existing = {
      id: 'weekly-2',
    }
    const query = makeQuery({
      maybeData: existing,
    })
    mocks.from.mockReturnValue(query)

    await expect(
      createWeeklyCheckInDraft({
        coachingPlanId: 'plan-1',
        checkinDate: '2026-08-16',
        weekNumber: 2,
        photosRequired: false,
        bodyFatSource: 'none',
      }),
    ).resolves.toEqual(existing)

    expect(query.insert).not.toHaveBeenCalled()
  })

  test('creates a new Weekly draft with normalized defaults', async () => {
    const loadQuery = makeQuery({
      maybeData: null,
    })
    const insertQuery = makeQuery({
      singleData: {
        id: 'weekly-2',
      },
    })

    mocks.from
      .mockReturnValueOnce(loadQuery)
      .mockReturnValueOnce(insertQuery)

    await expect(
      createWeeklyCheckInDraft({
        coachingPlanId: 'plan-1',
        checkinDate: '2026-08-16',
        weekNumber: 2,
        photosRequired: 1,
        bodyFatSource: '',
      }),
    ).resolves.toEqual({
      id: 'weekly-2',
    })

    expect(
      insertQuery.insert,
    ).toHaveBeenCalledWith({
      coaching_plan_id: 'plan-1',
      checkin_date: '2026-08-16',
      week_number: 2,
      status: 'draft',
      submitted_at: null,
      daily_checkin_id: null,
      draft_data: {},
      resume_step: null,
      photos_required: true,
      body_fat_source: 'none',
    })

    expect(
      insertQuery.insert.mock.calls[0][0],
    ).not.toHaveProperty('user_id')
  })

  test('recovers from a duplicate-create race by loading the Weekly row again', async () => {
    const firstLoad = makeQuery({
      maybeData: null,
    })
    const insert = makeQuery({
      singleError: {
        code: '23505',
      },
    })
    const secondLoad = makeQuery({
      maybeData: {
        id: 'weekly-existing',
      },
    })

    mocks.from
      .mockReturnValueOnce(firstLoad)
      .mockReturnValueOnce(insert)
      .mockReturnValueOnce(secondLoad)

    await expect(
      createWeeklyCheckInDraft({
        coachingPlanId: 'plan-1',
        checkinDate: '2026-08-16',
        weekNumber: 2,
        photosRequired: false,
        bodyFatSource: 'none',
      }),
    ).resolves.toEqual({
      id: 'weekly-existing',
    })
  })

  test('requires a Weekly draft id to autosave', async () => {
    await expect(
      saveWeeklyCheckInDraft(null, {}),
    ).rejects.toThrow(
      'A Weekly Check-In draft is required.',
    )
  })

  test('autosaves only a row still in draft status', async () => {
    const query = makeQuery({
      singleData: {
        id: 'weekly-1',
      },
    })
    mocks.from.mockReturnValue(query)

    await saveWeeklyCheckInDraft(
      'weekly-1',
      {
        form: {
          waist_inches: '32',
        },
        resumeStep: 'recovery',
        photosRequired: true,
        bodyFatSource: '',
      },
    )

    expect(query.update).toHaveBeenCalledWith({
      draft_data: {
        waist_inches: '32',
      },
      resume_step: 'recovery',
      photos_required: true,
      body_fat_source: 'none',
    })
    expect(query.eq).toHaveBeenNthCalledWith(
      1,
      'id',
      'weekly-1',
    )
    expect(query.eq).toHaveBeenNthCalledWith(
      2,
      'status',
      'draft',
    )
  })

  test('requires both Weekly and Daily ids to submit', async () => {
    await expect(
      completeWeeklyCheckIn(
        'weekly-1',
        {
          dailyCheckInId: null,
        },
      ),
    ).rejects.toThrow(
      'Weekly and Daily Check-Ins are required to submit.',
    )
  })

  test('completes only a draft row and stores structured values plus Daily link', async () => {
    const query = makeQuery({
      singleData: {
        id: 'weekly-1',
        status: 'completed',
      },
    })
    mocks.from.mockReturnValue(query)

    await completeWeeklyCheckIn(
      'weekly-1',
      {
        dailyCheckInId: 'daily-1',
        form: {
          waist_inches: '32',
        },
        structuredValues: {
          waist: 32,
          body_fat_source: 'none',
        },
      },
    )

    expect(query.update).toHaveBeenCalledWith(
      {
        waist: 32,
        body_fat_source: 'none',
        daily_checkin_id: 'daily-1',
        draft_data: {
          waist_inches: '32',
        },
        resume_step: null,
        status: 'completed',
        submitted_at: expect.any(String),
      },
    )
    expect(query.eq).toHaveBeenNthCalledWith(
      1,
      'id',
      'weekly-1',
    )
    expect(query.eq).toHaveBeenNthCalledWith(
      2,
      'status',
      'draft',
    )
  })

  test('propagates database errors', async () => {
    const error = new Error('Weekly failed')
    mocks.from.mockReturnValue(
      makeQuery({
        maybeError: error,
      }),
    )

    await expect(
      loadWeeklyCheckIn('plan-1', 2),
    ).rejects.toBe(error)
  })
})
