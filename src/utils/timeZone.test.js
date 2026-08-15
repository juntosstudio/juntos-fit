import {
  afterEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'
import {
  getBrowserTimeZone,
  getDateKeyForTimeZone,
} from './timeZone'

afterEach(() => {
  vi.useRealTimers()
})

describe('Browser time zone', () => {
  test('returns a non-empty time-zone string', () => {
    expect(typeof getBrowserTimeZone()).toBe('string')
    expect(getBrowserTimeZone().length).toBeGreaterThan(0)
  })
})

describe('Date key for IANA time zone', () => {
  test('returns the correct calendar date for America/Chicago near UTC midnight', () => {
    vi.useFakeTimers()
    vi.setSystemTime(
      new Date('2026-08-16T03:30:00Z'),
    )

    expect(
      getDateKeyForTimeZone(
        'America/Chicago',
      ),
    ).toBe('2026-08-15')
  })

  test('returns the correct calendar date for Asia/Tokyo at the same instant', () => {
    vi.useFakeTimers()
    vi.setSystemTime(
      new Date('2026-08-16T03:30:00Z'),
    )

    expect(
      getDateKeyForTimeZone(
        'Asia/Tokyo',
      ),
    ).toBe('2026-08-16')
  })

  test('handles year boundaries by requested time zone', () => {
    vi.useFakeTimers()
    vi.setSystemTime(
      new Date('2027-01-01T01:30:00Z'),
    )

    expect(
      getDateKeyForTimeZone(
        'America/Chicago',
      ),
    ).toBe('2026-12-31')

    expect(
      getDateKeyForTimeZone('UTC'),
    ).toBe('2027-01-01')
  })

  test('returns a YYYY-MM-DD date key', () => {
    vi.useFakeTimers()
    vi.setSystemTime(
      new Date('2026-08-15T12:00:00Z'),
    )

    expect(
      getDateKeyForTimeZone('UTC'),
    ).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
