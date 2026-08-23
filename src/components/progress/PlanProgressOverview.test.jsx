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
  PlanProgressOverview,
} from './PlanProgressOverview'

const plan = {
  id: 'plan-1',
  goal: 'fat_loss',
  program_length_weeks: 12,
  start_date: '2026-07-26',
  checkin_day: 0,
}

afterEach(() => cleanup())

describe('PlanProgressOverview', () => {
  test('shows all plan weeks as compact table rows', () => {
    render(
      <PlanProgressOverview
        plan={plan}
        currentWeekNumber={4}
        weeks={[]}
        measurements={[]}
      />,
    )

    expect(screen.getByText('W1')).toBeTruthy()
    expect(screen.getByText('W12')).toBeTruthy()
    expect(screen.getByText('Avg Weight')).toBeTruthy()
    expect(screen.getByText('Nutrition')).toBeTruthy()
    expect(screen.getByText('Consistency')).toBeTruthy()
  })

  test('keeps completed and current week navigation actionable', () => {
    const onOpenWeeklyReview = vi.fn()
    const onOpenCurrentWeek = vi.fn()

    render(
      <PlanProgressOverview
        plan={plan}
        currentWeekNumber={4}
        weeks={[
          {
            weekNumber: 3,
            weeklyStatus: 'completed',
            averageWeight: 157.7,
          },
          {
            weekNumber: 4,
            weeklyStatus: 'missing',
            averageWeight: 156.8,
          },
        ]}
        measurements={[]}
        onOpenWeeklyReview={onOpenWeeklyReview}
        onOpenCurrentWeek={onOpenCurrentWeek}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Week 3' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open Week 4' }))

    expect(onOpenWeeklyReview).toHaveBeenCalledWith(3)
    expect(onOpenCurrentWeek).toHaveBeenCalledTimes(1)
  })

  test('shows every full-measurement checkpoint as a row', () => {
    render(
      <PlanProgressOverview
        plan={plan}
        currentWeekNumber={4}
        weeks={[]}
        measurements={[
          {
            checkpoint: 'Start',
            checkinDate: '2026-07-26',
            weight: 160,
            bodyFat: 29.9,
            waist: 36.5,
          },
          {
            checkpoint: 'Week 4',
            checkinDate: '2026-08-23',
            weight: 157.2,
            bodyFat: 29.3,
            waist: 34,
          },
        ]}
      />,
    )

    expect(screen.getByText('Start')).toBeTruthy()
    expect(screen.getByText('Week 4')).toBeTruthy()
    expect(screen.getByText('36.5')).toBeTruthy()
    expect(screen.getByText('34.0')).toBeTruthy()
  })
})
