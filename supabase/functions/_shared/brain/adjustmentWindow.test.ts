import {
  describe,
  expect,
  test,
} from 'vitest'

import {
  isAdjustmentWindowExpired,
  PLAN_ADJUSTMENT_WINDOW_HOURS,
  resolveAdjustmentWindowDeadline,
} from './adjustmentWindow.ts'

describe('Plan Adjustment 24-hour window', () => {
  test('starts from Weekly finalization, not proposal creation', () => {
    expect(PLAN_ADJUSTMENT_WINDOW_HOURS).toBe(24)
    expect(
      resolveAdjustmentWindowDeadline({
        weeklySubmittedAt: '2026-08-22T14:30:00-05:00',
      }),
    ).toBe('2026-08-23T19:30:00.000Z')
  })

  test('remains open immediately before the deadline', () => {
    expect(
      isAdjustmentWindowExpired({
        weeklySubmittedAt: '2026-08-22T19:30:00.000Z',
        now: '2026-08-23T19:29:59.999Z',
      }),
    ).toBe(false)
  })

  test('expires exactly 24 hours after Weekly finalization', () => {
    expect(
      isAdjustmentWindowExpired({
        weeklySubmittedAt: '2026-08-22T19:30:00.000Z',
        now: '2026-08-23T19:30:00.000Z',
      }),
    ).toBe(true)
  })

  test('an explicit proposal deadline wins and does not reset on revision', () => {
    expect(
      resolveAdjustmentWindowDeadline({
        expiresAt: '2026-08-23T19:30:00.000Z',
        weeklySubmittedAt: '2026-08-22T20:00:00.000Z',
      }),
    ).toBe('2026-08-23T19:30:00.000Z')
  })

  test('missing finalization timing fails closed', () => {
    expect(
      isAdjustmentWindowExpired({}),
    ).toBe(true)
  })
})
