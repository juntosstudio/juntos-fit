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
  loadCheckInSettings,
  saveCheckInSettings,
} from './checkInSettingsService'

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

describe('checkInSettingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns defaults without querying when userId is missing', async () => {
    await expect(
      loadCheckInSettings(null),
    ).resolves.toEqual({
      track_water: true,
      track_alcohol: true,
      body_fat_source: 'none',
    })

    expect(mocks.from).not.toHaveBeenCalled()
  })

  test('loads and normalizes saved settings', async () => {
    const query = makeQuery({
      data: {
        user_id: 'user-1',
        track_water: false,
        track_alcohol: null,
        body_fat_source: 'bad-value',
        created_at: 'created',
        updated_at: 'updated',
      },
    })

    mocks.from.mockReturnValue(query)

    const result =
      await loadCheckInSettings('user-1')

    expect(mocks.from).toHaveBeenCalledWith(
      'user_settings',
    )
    expect(query.eq).toHaveBeenCalledWith(
      'user_id',
      'user-1',
    )
    expect(result).toMatchObject({
      user_id: 'user-1',
      track_water: false,
      track_alcohol: true,
      body_fat_source: 'none',
    })
  })

  test('propagates load errors', async () => {
    const error = new Error('Load failed')
    mocks.from.mockReturnValue(
      makeQuery({ error }),
    )

    await expect(
      loadCheckInSettings('user-1'),
    ).rejects.toBe(error)
  })

  test('requires a signed-in user to save settings', async () => {
    await expect(
      saveCheckInSettings(null, {}),
    ).rejects.toThrow(
      'You must be signed in to save settings.',
    )

    expect(mocks.from).not.toHaveBeenCalled()
  })

  test('normalizes and upserts settings by user_id', async () => {
    const query = makeQuery({
      data: {
        user_id: 'user-1',
        track_water: false,
        track_alcohol: true,
        body_fat_source: 'none',
      },
    })
    mocks.from.mockReturnValue(query)

    const result =
      await saveCheckInSettings(
        'user-1',
        {
          track_water: false,
          track_alcohol: null,
          body_fat_source: 'invalid',
        },
      )

    expect(query.upsert).toHaveBeenCalledWith(
      {
        user_id: 'user-1',
        track_water: false,
        track_alcohol: true,
        body_fat_source: 'none',
        updated_at: expect.any(String),
      },
      {
        onConflict: 'user_id',
      },
    )
    expect(result).toMatchObject({
      track_water: false,
      track_alcohol: true,
      body_fat_source: 'none',
    })
  })

  test('propagates save errors', async () => {
    const error = new Error('Save failed')
    mocks.from.mockReturnValue(
      makeQuery({ error }),
    )

    await expect(
      saveCheckInSettings(
        'user-1',
        {
          track_water: true,
          track_alcohol: true,
          body_fat_source: 'none',
        },
      ),
    ).rejects.toBe(error)
  })
})
