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


  test('a backfilled Daily does not repair a missed-day streak', () => {
    expect(
      calculateProgramCheckInStreak({
        planStartDate,
        today: '2026-08-20',
        timeZone: 'America/Chicago',
        startCheckIn: {
          status: 'completed',
          checkin_date: planStartDate,
          completed_at: '2026-07-26T13:00:00Z',
        },
        dailyCheckInDates: [
          {
            checkin_date: '2026-08-18',
            created_at: '2026-08-18T13:00:00Z',
          },
          {
            // Aug 19 was missed and entered late on Aug 20.
            checkin_date: '2026-08-19',
            created_at: '2026-08-20T15:00:00Z',
          },
        ],
      }),
    ).toBe(1)
  })

  test('a late Weekly starts a new streak on the day it is submitted', () => {
    expect(
      calculateProgramCheckInStreak({
        planStartDate,
        today: '2026-08-20',
        timeZone: 'America/Chicago',
        dailyCheckInDates: [
          {
            checkin_date: '2026-08-18',
            created_at: '2026-08-18T13:00:00Z',
          },
        ],
        weeklyCheckInDates: [
          {
            checkin_date: '2026-08-19',
            status: 'completed',
            submitted_at: '2026-08-20T16:00:00Z',
          },
        ],
      }),
    ).toBe(1)
  })

  test('uses the plan time zone when deciding the actual submission day', () => {
    expect(
      calculateProgramCheckInStreak({
        planStartDate,
        today: '2026-08-20',
        timeZone: 'America/Chicago',
        dailyCheckInDates: [
          {
            checkin_date: '2026-08-19',
            // 2026-08-20 UTC, but still Aug 19 in Chicago.
            created_at: '2026-08-20T03:30:00Z',
          },
        ],
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
