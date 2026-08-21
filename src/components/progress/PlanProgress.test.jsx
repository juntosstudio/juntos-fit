// @vitest-environment jsdom

import React from 'react'
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import {
  afterEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'
import {
  PlanProgress,
} from './PlanProgress'

const plan = {
  id: 'plan-1',
  goal: 'fat_loss',
  program_length_weeks: 12,
}

afterEach(() => {
  cleanup()
})

describe('PlanProgress overdue Weekly recovery', () => {
  test('makes an overdue prior Weekly actionable during grace', () => {
    const onOpenWeeklyCheckIn = vi.fn()

    render(
      <PlanProgress
        plan={plan}
        currentWeekNumber={5}
        weeks={[
          {
            weekNumber: 4,
            weeklyStatus: 'missing',
            weeklyDueDate: '2026-08-19',
            canCompleteWeekly: true,
            dailyCheckInCount: 6,
          },
        ]}
        onOpenWeeklyCheckIn={onOpenWeeklyCheckIn}
      />,
    )

    const overdue = screen.getByRole('button', {
      name: 'Complete Week 4 Weekly Check-In',
    })

    expect(overdue).toBeTruthy()
    expect(
      screen.getByText('Weekly Overdue'),
    ).toBeTruthy()

    fireEvent.click(overdue)

    expect(onOpenWeeklyCheckIn).toHaveBeenCalledWith(
      '2026-08-19',
    )
  })

  test('keeps an expired missing Weekly historical and non-actionable', () => {
    const onOpenWeeklyCheckIn = vi.fn()

    render(
      <PlanProgress
        plan={plan}
        currentWeekNumber={5}
        weeks={[
          {
            weekNumber: 4,
            weeklyStatus: 'missing',
            weeklyDueDate: '2026-08-19',
            canCompleteWeekly: false,
            dailyCheckInCount: 6,
          },
        ]}
        onOpenWeeklyCheckIn={onOpenWeeklyCheckIn}
      />,
    )

    expect(
      screen.getAllByText('No Weekly Check-In')
        .length,
    ).toBeGreaterThan(0)

    expect(
      screen.queryByRole('button', {
        name: 'Complete Week 4 Weekly Check-In',
      }),
    ).toBeNull()
  })
})

describe('PlanProgress all-weeks navigation', () => {
  test('sends the compact Dashboard view to Progress instead of expanding inline', () => {
    const onShowAllWeeks = vi.fn()

    render(
      <PlanProgress
        plan={plan}
        currentWeekNumber={5}
        weeks={[]}
        onShowAllWeeks={onShowAllWeeks}
      />,
    )

    const showAll = screen.getByRole('button', {
      name: /Show All Weeks/,
    })

    fireEvent.click(showAll)

    expect(onShowAllWeeks).toHaveBeenCalledTimes(1)
    expect(
      screen.queryByText('Week 12'),
    ).toBeNull()
  })

  test('dedicated Progress view stays fully expanded without a Show Less toggle', () => {
    render(
      <PlanProgress
        plan={plan}
        currentWeekNumber={5}
        weeks={[]}
        initialShowAll
      />,
    )

    expect(screen.getByText('Week 12')).toBeTruthy()
    expect(
      screen.queryByRole('button', {
        name: /Show All Weeks|Show Less/,
      }),
    ).toBeNull()
  })
})

