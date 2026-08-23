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

const startMeasurement = {
  checkpoint: 'Start',
  checkinDate: '2026-07-26',
  weight: 160,
  bodyFat: 29.9,
  waist: 36.5,
}

afterEach(() => cleanup())

describe('PlanProgressOverview', () => {
  test('shows start through current week by default and can reveal future weeks', () => {
    render(
      <PlanProgressOverview
        plan={plan}
        currentWeekNumber={4}
        weeks={[]}
        measurements={[startMeasurement]}
      />,
    )

    expect(screen.getAllByText('Start')).toHaveLength(2)
    expect(screen.getByText('W1')).toBeTruthy()
    expect(screen.getByText('W4')).toBeTruthy()
    expect(screen.queryByText('W12')).toBeNull()
    expect(screen.getByText('Avg Weight')).toBeTruthy()
    expect(screen.getByText('Nutrition')).toBeTruthy()
    expect(screen.getByText('Consistency')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Show remaining weeks (8)' }))
    expect(screen.getByText('W12')).toBeTruthy()
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
        measurements={[startMeasurement]}
        onOpenWeeklyReview={onOpenWeeklyReview}
        onOpenCurrentWeek={onOpenCurrentWeek}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open W3' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open W4' }))

    expect(onOpenWeeklyReview).toHaveBeenCalledWith(3)
    expect(onOpenCurrentWeek).toHaveBeenCalledTimes(1)
  })

  test('shows full measurements as checkpoints across columns', () => {
    render(
      <PlanProgressOverview
        plan={plan}
        currentWeekNumber={4}
        weeks={[]}
        measurements={[
          startMeasurement,
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

    expect(screen.getByText('Week 4')).toBeTruthy()
    expect(screen.getByText('36.5')).toBeTruthy()
    expect(screen.getByText('34.0')).toBeTruthy()
  })

  test('does not turn missing current-week values into zeroes', () => {
    render(
      <PlanProgressOverview
        plan={plan}
        currentWeekNumber={4}
        weeks={[{
          weekNumber: 4,
          weeklyStatus: 'missing',
          dailyCheckInCount: 0,
          averageWeight: null,
          nutritionAdherencePercent: 0,
          workoutsCompleted: 0,
          workoutsTarget: 3,
          cardioMinutes: 0,
          cardioTarget: 90,
        }]}
        measurements={[startMeasurement]}
      />,
    )

    expect(screen.queryByText('0.0')).toBeNull()
    expect(screen.queryByText('0%')).toBeNull()
    expect(screen.queryByText('0/3')).toBeNull()
    expect(screen.queryByText('0/90')).toBeNull()
  })
})
