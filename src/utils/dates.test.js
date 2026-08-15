import {
  afterEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'
import {
  addDays,
  dateKeyToUtcMilliseconds,
  getDateKeyWeekday,
  getFirstWeeklyCheckInDate,
  getProgramWeekRange,
  getTodayDateKey,
  isWeeklyCheckInDate,
} from './dates'

afterEach(() => {
  vi.useRealTimers()
})

describe('Date-key helpers', () => {
  test('returns today as a local YYYY-MM-DD date key', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 15, 10, 30, 0))

    expect(getTodayDateKey()).toBe('2026-08-15')
  })

  test('converts a date key to midnight UTC', () => {
    expect(dateKeyToUtcMilliseconds('2026-08-15')).toBe(
      Date.UTC(2026, 7, 15),
    )
  })

  test('adds days within the same month', () => {
    expect(addDays('2026-08-15', 3)).toBe('2026-08-18')
  })

  test('adds days across a month boundary', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01')
  })

  test('adds days across a year boundary', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  test('subtracts days across a month boundary', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  test('handles leap day correctly', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01')
  })

  test('returns the weekday using Sunday = 0 through Saturday = 6', () => {
    expect(getDateKeyWeekday('2026-07-26')).toBe(0)
    expect(getDateKeyWeekday('2026-07-27')).toBe(1)
    expect(getDateKeyWeekday('2026-08-01')).toBe(6)
  })

  test('returns null weekday for a missing date key', () => {
    expect(getDateKeyWeekday('')).toBeNull()
    expect(getDateKeyWeekday(null)).toBeNull()
  })
})

describe('Program week range', () => {
  const startDate = '2026-07-26'

  test('uses the first seven-day window on Start Day', () => {
    expect(getProgramWeekRange(startDate, '2026-07-26')).toEqual({
      weekStart: '2026-07-26',
      weekEnd: '2026-08-01',
    })
  })

  test('keeps dates through day seven in the first program week', () => {
    expect(getProgramWeekRange(startDate, '2026-08-01')).toEqual({
      weekStart: '2026-07-26',
      weekEnd: '2026-08-01',
    })
  })

  test('starts the second program week exactly seven days later', () => {
    expect(getProgramWeekRange(startDate, '2026-08-02')).toEqual({
      weekStart: '2026-08-02',
      weekEnd: '2026-08-08',
    })
  })

  test('finds later program weeks from the original anchor', () => {
    expect(getProgramWeekRange(startDate, '2026-08-15')).toEqual({
      weekStart: '2026-08-09',
      weekEnd: '2026-08-15',
    })
  })

  test('returns the first program window for a date before plan start', () => {
    expect(getProgramWeekRange(startDate, '2026-07-20')).toEqual({
      weekStart: '2026-07-26',
      weekEnd: '2026-08-01',
    })
  })
})

describe('First Weekly Check-In date', () => {
  const startDate = '2026-07-26'

  test('allows the same weekday exactly seven full days after Start Day', () => {
    expect(getFirstWeeklyCheckInDate(startDate, 0)).toBe('2026-08-02')
  })

  test('uses the first selected weekday after the seven-day minimum', () => {
    expect(getFirstWeeklyCheckInDate(startDate, 1)).toBe('2026-08-03')
    expect(getFirstWeeklyCheckInDate(startDate, 6)).toBe('2026-08-08')
  })

  test('does not choose a selected weekday before seven full days have elapsed', () => {
    expect(getFirstWeeklyCheckInDate('2026-07-27', 0)).toBe('2026-08-09')
  })

  test('accepts a numeric weekday string from persisted/form data', () => {
    expect(getFirstWeeklyCheckInDate(startDate, '0')).toBe('2026-08-02')
  })

  test('returns null when Start Day is missing', () => {
    expect(getFirstWeeklyCheckInDate('', 0)).toBeNull()
  })

  test('returns null when the check-in weekday is not an integer', () => {
    expect(getFirstWeeklyCheckInDate(startDate, 'Sunday')).toBeNull()
    expect(getFirstWeeklyCheckInDate(startDate, 1.5)).toBeNull()
  })
})

describe('Recurring Weekly Check-In dates', () => {
  const startDate = '2026-07-26'
  const checkinDay = 0

  test('does not treat Start Day as a Weekly Check-In', () => {
    expect(
      isWeeklyCheckInDate(startDate, checkinDay, '2026-07-26'),
    ).toBe(false)
  })

  test('does not treat dates before the first Weekly as Weekly', () => {
    expect(
      isWeeklyCheckInDate(startDate, checkinDay, '2026-08-01'),
    ).toBe(false)
  })

  test('recognizes the first Weekly Check-In date', () => {
    expect(
      isWeeklyCheckInDate(startDate, checkinDay, '2026-08-02'),
    ).toBe(true)
  })

  test('recognizes recurring Weekly dates every seven days', () => {
    expect(
      isWeeklyCheckInDate(startDate, checkinDay, '2026-08-09'),
    ).toBe(true)

    expect(
      isWeeklyCheckInDate(startDate, checkinDay, '2026-08-16'),
    ).toBe(true)
  })

  test('rejects dates between Weekly Check-Ins', () => {
    expect(
      isWeeklyCheckInDate(startDate, checkinDay, '2026-08-08'),
    ).toBe(false)

    expect(
      isWeeklyCheckInDate(startDate, checkinDay, '2026-08-10'),
    ).toBe(false)
  })

  test('returns false when current date is missing', () => {
    expect(
      isWeeklyCheckInDate(startDate, checkinDay, ''),
    ).toBe(false)
  })
})
