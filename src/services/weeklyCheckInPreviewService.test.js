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
  loadWeeklyBodyFatProfile,
} from './weeklyCheckInPreviewService'

function makeQuery({
  data = null,
  error = null,
} = {}) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  }

  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.maybeSingle.mockResolvedValue({
    data,
    error,
  })

  return query
}

describe('weeklyCheckInPreviewService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns null without querying when userId is missing', async () => {
    await expect(
      loadWeeklyBodyFatProfile(null),
    ).resolves.toBeNull()

    expect(mocks.from).not.toHaveBeenCalled()
  })

  test('loads only the profile fields needed by RFM', async () => {
    const data = {
      height_cm: 170,
      sex: 'female',
    }
    const query = makeQuery({ data })
    mocks.from.mockReturnValue(query)

    await expect(
      loadWeeklyBodyFatProfile('user-1'),
    ).resolves.toEqual(data)

    expect(mocks.from).toHaveBeenCalledWith(
      'profiles',
    )
    expect(query.select).toHaveBeenCalledWith(
      'height_cm, sex',
    )
    expect(query.eq).toHaveBeenCalledWith(
      'id',
      'user-1',
    )
  })

  test('propagates profile load errors', async () => {
    const error = new Error('Profile failed')
    mocks.from.mockReturnValue(
      makeQuery({ error }),
    )

    await expect(
      loadWeeklyBodyFatProfile('user-1'),
    ).rejects.toBe(error)
  })
})
