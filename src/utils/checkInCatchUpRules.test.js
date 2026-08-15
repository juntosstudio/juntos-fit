import {
  describe,
  expect,
  test,
} from 'vitest'
import {
  WEEKLY_DUE_STATE,
  WEEKLY_GRACE_DAYS,
  buildCatchUpItems,
  canBackfillDaily,
  canEditSubmittedWeekly,
  getMissedCheckInCount,
  getUnresolvedDailyDates,
  getWeeklyDueState,
  getWeeklyGraceDaysRemaining,
  getWeeklyGraceEndDate,
  getWeeklyReadiness,
  requiresMissedWeekRecovery,
  shouldFinalizeSubmittedWeekly,
} from './checkInCatchUpRules'

describe('Weekly grace period', () => {
  const due = '2026-08-16'

  test('uses a three-calendar-day grace period', () => {
    expect(WEEKLY_GRACE_DAYS).toBe(3)
    expect(getWeeklyGraceEndDate(due)).toBe('2026-08-19')
  })

  test('is due on the scheduled Weekly date', () => {
    expect(getWeeklyDueState({
      weeklyDueDate: due,
      todayDate: '2026-08-16',
    })).toBe(WEEKLY_DUE_STATE.DUE)
  })

  test('is overdue during all three grace days', () => {
    for (const date of ['2026-08-17', '2026-08-18', '2026-08-19']) {
      expect(getWeeklyDueState({
        weeklyDueDate: due,
        todayDate: date,
      })).toBe(WEEKLY_DUE_STATE.OVERDUE)
    }
  })

  test('expires the morning after the final grace day', () => {
    expect(getWeeklyDueState({
      weeklyDueDate: due,
      todayDate: '2026-08-20',
    })).toBe(WEEKLY_DUE_STATE.EXPIRED)
  })

  test('reports grace days remaining', () => {
    expect(getWeeklyGraceDaysRemaining({
      weeklyDueDate: due,
      todayDate: '2026-08-17',
    })).toBe(2)

    expect(getWeeklyGraceDaysRemaining({
      weeklyDueDate: due,
      todayDate: '2026-08-18',
    })).toBe(1)

    expect(getWeeklyGraceDaysRemaining({
      weeklyDueDate: due,
      todayDate: '2026-08-19',
    })).toBe(0)
  })
})

describe('Missed Daily resolution', () => {
  const expected = [
    '2026-08-10',
    '2026-08-11',
    '2026-08-12',
    '2026-08-13',
    '2026-08-14',
    '2026-08-15',
    '2026-08-16',
  ]

  test('only returns past unresolved Daily dates', () => {
    expect(getUnresolvedDailyDates({
      expectedDailyDates: expected,
      completedDailyDates: ['2026-08-10', '2026-08-12'],
      unavailableDailyDates: ['2026-08-13'],
      todayDate: '2026-08-15',
      weeklyDueDate: '2026-08-16',
    })).toEqual(['2026-08-11', '2026-08-14'])
  })

  test('does not call today a missed check-in', () => {
    expect(getUnresolvedDailyDates({
      expectedDailyDates: ['2026-08-14', '2026-08-15'],
      completedDailyDates: [],
      unavailableDailyDates: [],
      todayDate: '2026-08-15',
      weeklyDueDate: '2026-08-16',
    })).toEqual(['2026-08-14'])
  })

  test('does not treat Weekly day as a separate missed Daily', () => {
    expect(getUnresolvedDailyDates({
      expectedDailyDates: expected,
      completedDailyDates: expected.slice(0, 6),
      unavailableDailyDates: [],
      todayDate: '2026-08-17',
      weeklyDueDate: '2026-08-16',
    })).toEqual([])
  })

  test('no unresolved days means Weekly is ready', () => {
    expect(getWeeklyReadiness({
      unresolvedDailyDates: [],
    })).toEqual({
      ready: true,
      unresolvedDailyDates: [],
      unresolvedCount: 0,
    })
  })

  test('unresolved days block Weekly', () => {
    expect(getWeeklyReadiness({
      unresolvedDailyDates: ['2026-08-11', '2026-08-14'],
    })).toEqual({
      ready: false,
      unresolvedDailyDates: ['2026-08-11', '2026-08-14'],
      unresolvedCount: 2,
    })
  })
})

describe('Daily backfill boundary', () => {
  const weeklyDueDate = '2026-08-16'

  test('allows a missed day during the current open week', () => {
    expect(canBackfillDaily({
      dailyDate: '2026-08-12',
      todayDate: '2026-08-14',
      weeklyDueDate,
    })).toBe(true)
  })

  test('allows old-week Daily catch-up during Weekly grace', () => {
    expect(canBackfillDaily({
      dailyDate: '2026-08-12',
      todayDate: '2026-08-18',
      weeklyDueDate,
    })).toBe(true)
  })

  test('locks Daily catch-up after Weekly grace expires', () => {
    expect(canBackfillDaily({
      dailyDate: '2026-08-12',
      todayDate: '2026-08-20',
      weeklyDueDate,
    })).toBe(false)
  })

  test('does not backfill today through Missed Check-Ins', () => {
    expect(canBackfillDaily({
      dailyDate: '2026-08-14',
      todayDate: '2026-08-14',
      weeklyDueDate,
    })).toBe(false)
  })

  test('does not backfill a future date', () => {
    expect(canBackfillDaily({
      dailyDate: '2026-08-15',
      todayDate: '2026-08-14',
      weeklyDueDate,
    })).toBe(false)
  })

  test('locks Daily catch-up after Weekly is submitted', () => {
    expect(canBackfillDaily({
      dailyDate: '2026-08-12',
      todayDate: '2026-08-16',
      weeklyDueDate,
      weeklyStatus: 'submitted',
    })).toBe(false)
  })
})

describe('Catch Up button/count behavior', () => {
  const args = {
    weekNumber: 3,
    weeklyDueDate: '2026-08-16',
    unresolvedDailyDates: ['2026-08-11', '2026-08-14'],
  }

  test('before Weekly is due, count contains only missed Daily items', () => {
    expect(getMissedCheckInCount({
      ...args,
      todayDate: '2026-08-15',
    })).toBe(2)
  })

  test('on Weekly due date, Weekly is primary and is not counted as missed', () => {
    expect(getMissedCheckInCount({
      ...args,
      todayDate: '2026-08-16',
    })).toBe(2)
  })

  test('after Weekly is missed, overdue Weekly joins the count', () => {
    expect(getMissedCheckInCount({
      ...args,
      todayDate: '2026-08-17',
    })).toBe(3)
  })

  test('Catch Up lists Daily items before the overdue Weekly', () => {
    expect(buildCatchUpItems({
      ...args,
      todayDate: '2026-08-17',
    })).toEqual([
      {
        type: 'daily',
        date: '2026-08-11',
        weekNumber: 3,
      },
      {
        type: 'daily',
        date: '2026-08-14',
        weekNumber: 3,
      },
      {
        type: 'weekly',
        date: '2026-08-16',
        weekNumber: 3,
        closesOn: '2026-08-19',
      },
    ])
  })

  test('expired Weekly is not offered as a completable Catch Up button', () => {
    expect(buildCatchUpItems({
      ...args,
      todayDate: '2026-08-20',
    })).toEqual([])
  })
})

describe('Missed week recovery', () => {
  test('is not required while Weekly remains in grace', () => {
    expect(requiresMissedWeekRecovery({
      weeklyDueDate: '2026-08-16',
      todayDate: '2026-08-19',
    })).toBe(false)
  })

  test('is required after grace expires without a Weekly', () => {
    expect(requiresMissedWeekRecovery({
      weeklyDueDate: '2026-08-16',
      todayDate: '2026-08-20',
    })).toBe(true)
  })

  test('a finalized Weekly never triggers missed-week recovery', () => {
    expect(requiresMissedWeekRecovery({
      weeklyDueDate: '2026-08-16',
      todayDate: '2026-08-20',
      weeklyStatus: 'finalized',
    })).toBe(false)
  })
})

describe('Submitted Weekly edit window', () => {
  test('can be corrected for the rest of the local submission day', () => {
    expect(canEditSubmittedWeekly({
      weeklyStatus: 'submitted',
      submittedLocalDate: '2026-08-18',
      currentLocalDate: '2026-08-18',
    })).toBe(true)
  })

  test('cannot be corrected after local midnight', () => {
    expect(canEditSubmittedWeekly({
      weeklyStatus: 'submitted',
      submittedLocalDate: '2026-08-18',
      currentLocalDate: '2026-08-19',
    })).toBe(false)
  })

  test('should finalize after the local calendar date advances', () => {
    expect(shouldFinalizeSubmittedWeekly({
      weeklyStatus: 'submitted',
      submittedLocalDate: '2026-08-18',
      currentLocalDate: '2026-08-19',
    })).toBe(true)
  })

  test('does not finalize during the same local calendar day', () => {
    expect(shouldFinalizeSubmittedWeekly({
      weeklyStatus: 'submitted',
      submittedLocalDate: '2026-08-18',
      currentLocalDate: '2026-08-18',
    })).toBe(false)
  })
})
