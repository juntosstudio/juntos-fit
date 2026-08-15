import {
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  getTodayDateKey: vi.fn(
    () => '2026-08-15',
  ),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: mocks.from,
    rpc: mocks.rpc,
  },
}))

vi.mock('../utils/dates', () => ({
  getTodayDateKey:
    mocks.getTodayDateKey,
}))

import {
  completeStartCheckIn,
  createStartCheckInDraft,
  loadBodyFatProfile,
  loadStartCheckIn,
  savePlanMeasurementPreferences,
  saveStartCheckInMeasurements,
} from './startCheckInService'

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

describe('startCheckInService profile and loading', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns null profile without querying when userId is missing', async () => {
    await expect(
      loadBodyFatProfile(null),
    ).resolves.toBeNull()

    expect(mocks.from).not.toHaveBeenCalled()
  })

  test('loads profile fields needed by Start Check-In', async () => {
    const data = {
      id: 'user-1',
      height_cm: 170,
      sex: 'female',
    }
    const query = makeQuery({
      singleData: data,
    })
    mocks.from.mockReturnValue(query)

    await expect(
      loadBodyFatProfile('user-1'),
    ).resolves.toEqual(data)

    expect(mocks.from).toHaveBeenCalledWith(
      'profiles',
    )
    expect(query.eq).toHaveBeenCalledWith(
      'id',
      'user-1',
    )
  })

  test('requires a plan id to load Start Check-In', async () => {
    await expect(
      loadStartCheckIn(null),
    ).rejects.toThrow(
      'A coaching plan is required.',
    )
  })

  test('loads the plan Start Check-In', async () => {
    const data = {
      id: 'start-1',
    }
    const query = makeQuery({
      maybeData: data,
    })
    mocks.from.mockReturnValue(query)

    await expect(
      loadStartCheckIn('plan-1'),
    ).resolves.toEqual(data)

    expect(query.eq).toHaveBeenCalledWith(
      'coaching_plan_id',
      'plan-1',
    )
  })
})

describe('startCheckInService draft creation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns an existing Start Check-In without inserting', async () => {
    const query = makeQuery({
      maybeData: {
        id: 'start-existing',
      },
    })
    mocks.from.mockReturnValue(query)

    await expect(
      createStartCheckInDraft(
        'plan-1',
        '2026-08-15',
      ),
    ).resolves.toEqual({
      id: 'start-existing',
    })

    expect(query.insert).not.toHaveBeenCalled()
  })

  test('creates a new Start Check-In draft', async () => {
    const loadQuery = makeQuery({
      maybeData: null,
    })
    const insertQuery = makeQuery({
      singleData: {
        id: 'start-1',
      },
    })

    mocks.from
      .mockReturnValueOnce(loadQuery)
      .mockReturnValueOnce(insertQuery)

    await expect(
      createStartCheckInDraft(
        'plan-1',
        '2026-08-15',
      ),
    ).resolves.toEqual({
      id: 'start-1',
    })

    expect(
      insertQuery.insert,
    ).toHaveBeenCalledWith({
      coaching_plan_id: 'plan-1',
      checkin_date: '2026-08-15',
      status: 'draft',
    })
  })

  test('recovers from duplicate Start draft creation by loading again', async () => {
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
        id: 'start-existing',
      },
    })

    mocks.from
      .mockReturnValueOnce(firstLoad)
      .mockReturnValueOnce(insert)
      .mockReturnValueOnce(secondLoad)

    await expect(
      createStartCheckInDraft(
        'plan-1',
        '2026-08-15',
      ),
    ).resolves.toEqual({
      id: 'start-existing',
    })
  })
})

describe('startCheckInService preferences and measurements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('requires a valid measurement side', async () => {
    await expect(
      savePlanMeasurementPreferences(
        'plan-1',
        {
          measurementSide: 'center',
        },
      ),
    ).rejects.toThrow(
      'Choose the left or right side.',
    )
  })

  test('saves plan measurement side and time zone through RPC', async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        measurement_side: 'left',
      },
      error: null,
    })
    mocks.rpc.mockReturnValue({
      single,
    })

    await expect(
      savePlanMeasurementPreferences(
        'plan-1',
        {
          measurementSide: 'left',
          timeZone: 'America/Chicago',
        },
      ),
    ).resolves.toEqual({
      measurement_side: 'left',
    })

    expect(mocks.rpc).toHaveBeenCalledWith(
      'save_start_checkin_plan_preferences',
      {
        p_coaching_plan_id: 'plan-1',
        p_measurement_side: 'left',
        p_time_zone: 'America/Chicago',
      },
    )
  })

  test('requires a Start Check-In id to save measurements', async () => {
    await expect(
      saveStartCheckInMeasurements(
        null,
        {},
      ),
    ).rejects.toThrow(
      'A Start Check-In is required.',
    )
  })

  test('normalizes numeric and nullable measurement values before updating', async () => {
    const query = makeQuery({
      singleData: {
        id: 'start-1',
      },
    })
    mocks.from.mockReturnValue(query)

    await saveStartCheckInMeasurements(
      'start-1',
      {
        starting_weight_lbs: '150.5',
        neck_inches: '14',
        chest_inches: '',
        waist_inches: 32,
        body_fat_percent: null,
        body_fat_status: 'estimated',
        body_fat_method:
          'juntos_estimate',
        body_fat_formula_version:
          'rfm_v1',
        ignored_field: 'ignore me',
      },
    )

    expect(query.update).toHaveBeenCalledWith({
      starting_weight_lbs: 150.5,
      body_fat_percent: null,
      neck_inches: 14,
      chest_inches: null,
      waist_inches: 32,
      body_fat_status: 'estimated',
      body_fat_method:
        'juntos_estimate',
      body_fat_formula_version:
        'rfm_v1',
    })
    expect(query.eq).toHaveBeenCalledWith(
      'id',
      'start-1',
    )
  })

  test('rejects invalid measurement numbers before updating', async () => {
    await expect(
      saveStartCheckInMeasurements(
        'start-1',
        {
          waist_inches: 'not-a-number',
        },
      ),
    ).rejects.toThrow(
      'Measurements must contain valid numbers.',
    )

    expect(mocks.from).not.toHaveBeenCalled()
  })

  test('marks Start Check-In completed with a timestamp', async () => {
    const query = makeQuery({
      singleData: {
        id: 'start-1',
        status: 'completed',
      },
    })
    mocks.from.mockReturnValue(query)

    await completeStartCheckIn(
      'start-1',
    )

    expect(query.update).toHaveBeenCalledWith({
      status: 'completed',
      completed_at: expect.any(String),
    })
    expect(query.eq).toHaveBeenCalledWith(
      'id',
      'start-1',
    )
  })
})
