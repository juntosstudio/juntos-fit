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
  test('shows weekly history cards through two upcoming weeks and can reveal all weeks', () => {
    render(
      <PlanProgressOverview
        plan={plan}
        currentWeekNumber={4}
        weeks={[]}
        measurements={[startMeasurement]}
      />,
    )

    expect(screen.getByText('Weekly History')).toBeTruthy()
    expect(screen.getByText('Week 1')).toBeTruthy()
    expect(screen.getByText('Week 6')).toBeTruthy()
    expect(screen.queryByText('Week 12')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '••• Show All Weeks' }))
    expect(screen.getByText('Week 12')).toBeTruthy()
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

    fireEvent.click(screen.getByRole('button', { name: 'Open Week 3' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open Week 4' }))

    expect(onOpenWeeklyReview).toHaveBeenCalledWith(3)
    expect(onOpenCurrentWeek).toHaveBeenCalledTimes(1)
  })

  test('shows each available weekly average change from Start', () => {
    render(
      <PlanProgressOverview
        plan={plan}
        currentWeekNumber={4}
        weeks={[
          {
            weekNumber: 1,
            weeklyStatus: 'missing',
            dailyCheckInCount: 5,
            averageWeight: 156.2,
          },
          {
            weekNumber: 3,
            weeklyStatus: 'completed',
            dailyCheckInCount: 7,
            consistencyPercent: 98,
            averageWeight: 157,
          },
        ]}
        measurements={[startMeasurement]}
      />,
    )

    expect(screen.getByText('↓ 3.8 lbs from Start')).toBeTruthy()
    expect(screen.getByText('↓ 3.0 lbs from Start')).toBeTruthy()
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

    expect(screen.getAllByText('Week 4').length).toBeGreaterThanOrEqual(2)
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

  test('shows a real weight dashboard card and opens the weight detail view', () => {
    render(
      <PlanProgressOverview
        plan={plan}
        currentWeekNumber={4}
        weeks={[]}
        measurements={[startMeasurement]}
        weightHistory={[
          { checkinDate: '2026-07-27', weight: 157.6 },
          { checkinDate: '2026-08-03', weight: 157.6 },
          { checkinDate: '2026-08-23', weight: 157.2 },
        ]}
        photoMarkers={[
          { key: 'week-4', checkpoint: 'Week 4', checkinDate: '2026-08-23' },
        ]}
      />,
    )

    expect(screen.getAllByText('Weight').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('↓ 2.8 lbs from Start')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Open Weight Progress' }))

    expect(screen.getByRole('heading', { name: 'Weight Progress' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'PLAN' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('Camera markers show dates with progress photos.')).toBeTruthy()
    expect(screen.getByText('AVERAGE')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'W' }))
    expect(screen.getByText('Week')).toBeTruthy()
  })

})
