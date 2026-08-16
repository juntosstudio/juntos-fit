import {
  describe,
  expect,
  test,
} from 'vitest'
import {
  calculateProgramCheckInStreak,
} from './checkInStreak'

const planStartDate = '2026-07-26'

function dailyDates(...dates) {
  return dates.map((checkin_date) => ({
    checkin_date,
  }))
}

function weeklyDates(...dates) {
  return dates.map((checkin_date) => ({
    checkin_date,
    status: 'completed',
  }))
}

describe('Program check-in streak', () => {
  test('counts a completed Start Day as the first streak day', () => {
    expect(
      calculateProgramCheckInStreak({
        planStartDate,
        today: planStartDate,
        startCheckIn: {
          status: 'completed',
          checkin_date: planStartDate,
        },
      }),
    ).toBe(1)
  })

  test('keeps yesterday streak while today check-in is still pending', () => {
    expect(
      calculateProgramCheckInStreak({
        planStartDate,
        today: '2026-07-28',
        startCheckIn: {
          status: 'completed',
          checkin_date: planStartDate,
        },
        dailyCheckInDates: dailyDates(
          '2026-07-27',
        ),
      }),
    ).toBe(2)
  })

  test('continues across a completed Weekly Check-In', () => {
    expect(
      calculateProgramCheckInStreak({
        planStartDate,
        today: '2026-08-02',
        startCheckIn: {
          status: 'completed',
          checkin_date: planStartDate,
        },
        dailyCheckInDates: dailyDates(
          '2026-07-27',
          '2026-07-28',
          '2026-07-29',
          '2026-07-30',
          '2026-07-31',
          '2026-08-01',
        ),
        weeklyCheckInDates: weeklyDates(
          '2026-08-02',
        ),
      }),
    ).toBe(8)
  })

  test('does not reset merely because Weekly Sunday is pending', () => {
    expect(
      calculateProgramCheckInStreak({
        planStartDate,
        today: '2026-08-02',
        startCheckIn: {
          status: 'completed',
          checkin_date: planStartDate,
        },
        dailyCheckInDates: dailyDates(
          '2026-07-27',
          '2026-07-28',
          '2026-07-29',
          '2026-07-30',
          '2026-07-31',
          '2026-08-01',
        ),
      }),
    ).toBe(7)
  })

  test('a true missed day breaks the prior streak', () => {
    expect(
      calculateProgramCheckInStreak({
        planStartDate,
        today: '2026-07-29',
        startCheckIn: {
          status: 'completed',
          checkin_date: planStartDate,
        },
        dailyCheckInDates: dailyDates(
          '2026-07-27',
          // Jul 28 is truly missing.
          '2026-07-29',
        ),
      }),
    ).toBe(1)
  })

  test('returns zero before the plan starts', () => {
    expect(
      calculateProgramCheckInStreak({
        planStartDate,
        today: '2026-07-25',
      }),
    ).toBe(0)
  })
})
