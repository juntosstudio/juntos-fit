import {
  describe,
  expect,
  test,
} from 'vitest'
import {
  getPlanWeekNumber,
} from './planProgress'

const plan = {
  start_date: '2026-07-26',
  checkin_day: 0,
  program_length_weeks: 12,
}

describe('Plan Progress reporting week number', () => {
  test('keeps the closing Weekly Sunday in Week 3', () => {
    expect(
      getPlanWeekNumber(
        plan,
        '2026-08-16',
      ),
    ).toBe(3)
  })

  test('moves to Week 4 the next morning', () => {
    expect(
      getPlanWeekNumber(
        plan,
        '2026-08-17',
      ),
    ).toBe(4)
  })

  test('starts at Week 1 on Start Day', () => {
    expect(
      getPlanWeekNumber(
        plan,
        '2026-07-26',
      ),
    ).toBe(1)
  })

  test('returns null before Start Day', () => {
    expect(
      getPlanWeekNumber(
        plan,
        '2026-07-25',
      ),
    ).toBeNull()
  })

  test('does not exceed the program length', () => {
    expect(
      getPlanWeekNumber(
        plan,
        '2027-01-01',
      ),
    ).toBe(12)
  })
})
