import {
  describe,
  expect,
  test,
} from 'vitest'
import {
  getPlanProgressWeekNumber,
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


describe('Plan Progress program week after Weekly closeout', () => {
  test('keeps Week 3 current while the Weekly is still due', () => {
    expect(
      getPlanProgressWeekNumber(
        plan,
        '2026-08-16',
        null,
      ),
    ).toBe(3)
  })

  test('keeps Week 3 current while its Weekly is only a draft', () => {
    expect(
      getPlanProgressWeekNumber(
        plan,
        '2026-08-16',
        {
          week_number: 3,
          checkin_date: '2026-08-16',
          status: 'draft',
        },
      ),
    ).toBe(3)
  })

  test('moves Plan Progress to Week 4 immediately after Week 3 Weekly completes', () => {
    expect(
      getPlanProgressWeekNumber(
        plan,
        '2026-08-16',
        {
          week_number: 3,
          checkin_date: '2026-08-16',
          status: 'completed',
        },
      ),
    ).toBe(4)
  })

  test('still reports Week 4 normally the next morning', () => {
    expect(
      getPlanProgressWeekNumber(
        plan,
        '2026-08-17',
        null,
      ),
    ).toBe(4)
  })

  test('does not advance for a completed Weekly from another date', () => {
    expect(
      getPlanProgressWeekNumber(
        plan,
        '2026-08-16',
        {
          week_number: 2,
          checkin_date: '2026-08-09',
          status: 'completed',
        },
      ),
    ).toBe(3)
  })

  test('does not create a Week 13 after the final Weekly', () => {
    expect(
      getPlanProgressWeekNumber(
        plan,
        '2026-10-18',
        {
          week_number: 12,
          checkin_date: '2026-10-18',
          status: 'completed',
        },
      ),
    ).toBe(12)
  })
})
