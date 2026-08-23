import { useState } from 'react'
import {
  getReportingWeekRange,
} from '../../utils/dates'
import {
  formatGoal,
} from '../../utils/formatters'

function numeric(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function formatDate(value) {
  if (!value) return '—'

  const [year, month, day] = String(value)
    .split('-')
    .map(Number)

  if (!year || !month || !day) return value

  return new Intl.DateTimeFormat('en-US', {
    month: 'numeric',
    day: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

function formatDateRange(start, end) {
  if (!start && !end) return '—'
  if (start === end) return formatDate(start)
  return `${formatDate(start)}–${formatDate(end)}`
}

function formatWeight(value) {
  const number = numeric(value)
  return number === null ? '—' : number.toFixed(1)
}

function formatPercent(value) {
  const number = numeric(value)
  return number === null ? '—' : `${Math.round(number)}%`
}

function formatRatio(value, target) {
  const current = numeric(value)
  const goal = numeric(target)

  if (current === null && goal === null) return '—'
  if (goal === null) return current === null ? '—' : String(current)
  return `${current ?? 0}/${goal}`
}

function formatMeasurement(value) {
  const number = numeric(value)
  return number === null ? '—' : number.toFixed(1)
}

function getStatus(row, currentWeekNumber) {
  if (row?.weeklyStatus === 'completed') return 'Completed'
  if (Number(row?.weekNumber) === Number(currentWeekNumber)) return 'Current'
  if (row?.canCompleteWeekly) return 'Weekly Overdue'
  if (row?.weeklyStatus === 'draft') return 'Needs Review'
  if (
    currentWeekNumber &&
    Number(row?.weekNumber) < Number(currentWeekNumber)
  ) {
    return 'No Weekly'
  }
  return 'Upcoming'
}

function getWeekAction({
  row,
  currentWeekNumber,
  onOpenCurrentWeek,
  onOpenWeeklyReview,
  onOpenWeeklyCheckIn,
}) {
  if (row?.weeklyStatus === 'completed' && onOpenWeeklyReview) {
    return () => onOpenWeeklyReview(row.weekNumber)
  }

  if (row?.canCompleteWeekly && onOpenWeeklyCheckIn) {
    return () => onOpenWeeklyCheckIn(row.weeklyDueDate)
  }

  if (
    Number(row?.weekNumber) === Number(currentWeekNumber) &&
    onOpenCurrentWeek
  ) {
    return onOpenCurrentWeek
  }

  return null
}

function buildAllWeeks(plan, currentWeekNumber, weeks) {
  const byWeek = new Map(
    (weeks ?? []).map((row) => [Number(row.weekNumber), row]),
  )
  const length = Number(plan?.program_length_weeks) || 0

  return Array.from({ length }, (_, index) => {
    const weekNumber = index + 1
    const row = byWeek.get(weekNumber) ?? { weekNumber }
    const range = getReportingWeekRange(
      plan.start_date,
      plan.checkin_day,
      weekNumber,
    )

    return {
      ...row,
      weekNumber,
      reportingStart: row.reportingStart ?? range?.reportingStart ?? null,
      reportingEnd: row.reportingEnd ?? range?.reportingEnd ?? null,
      weeklyDueDate: row.weeklyDueDate ?? range?.weeklyDueDate ?? null,
      statusLabel: getStatus(row, currentWeekNumber),
    }
  })
}

function WeekColumnHeader({ label, action, isCurrent = false }) {
  const content = (
    <>
      <span>{label}</span>
      {action ? <span className="progress-week-arrow" aria-hidden="true">›</span> : null}
    </>
  )

  if (!action) {
    return <span className="progress-week-column-label">{content}</span>
  }

  return (
    <button
      type="button"
      className={`progress-week-column-button${isCurrent ? ' is-current' : ''}`}
      onClick={action}
      aria-label={`Open ${label}`}
    >
      {content}
    </button>
  )
}

function WeeklyProgressTable({
  plan,
  currentWeekNumber,
  weeks,
  measurements,
  onOpenCurrentWeek,
  onOpenWeeklyReview,
  onOpenWeeklyCheckIn,
}) {
  const [showFutureWeeks, setShowFutureWeeks] = useState(false)
  const allWeeks = buildAllWeeks(plan, currentWeekNumber, weeks)
  const current = Math.max(1, Number(currentWeekNumber) || 1)
  const visibleWeeks = showFutureWeeks
    ? allWeeks
    : allWeeks.filter((row) => Number(row.weekNumber) <= current)
  const hiddenWeekCount = Math.max(0, allWeeks.length - visibleWeeks.length)
  const start = (measurements ?? []).find(
    (row) => String(row.checkpoint).toLowerCase() === 'start',
  )

  const metricRows = [
    {
      label: 'Dates',
      start: formatDate(start?.checkinDate ?? plan?.start_date),
      value: (row) => formatDateRange(row.reportingStart, row.reportingEnd),
    },
    {
      label: 'Consistency',
      start: '—',
      value: (row) => formatPercent(row.consistencyPercent),
    },
    {
      label: 'Avg Weight',
      start: formatWeight(start?.weight),
      value: (row) => formatWeight(row.averageWeight),
    },
    {
      label: 'Nutrition',
      start: '—',
      value: (row) => row.dailyCheckInCount ? formatPercent(row.nutritionAdherencePercent) : '—',
    },
    {
      label: 'Workouts',
      start: '—',
      value: (row) => row.dailyCheckInCount ? formatRatio(row.workoutsCompleted, row.workoutsTarget) : '—',
    },
    {
      label: 'Cardio',
      start: '—',
      value: (row) => row.dailyCheckInCount ? formatRatio(row.cardioMinutes, row.cardioTarget) : '—',
    },
    {
      label: 'Status',
      start: 'Baseline',
      value: (row) => row.statusLabel,
      status: true,
    },
  ]

  return (
    <section className="progress-overview-section">
      <div className="progress-overview-section-heading">
        <div>
          <h3>Weekly Progress</h3>
          <p>Swipe sideways to compare each week against your start.</p>
        </div>
      </div>

      <div className="progress-table-scroll" tabIndex="0">
        <table className="progress-data-table progress-transposed-table weekly-progress-table">
          <thead>
            <tr>
              <th className="is-sticky-metric-column">Metric</th>
              <th className="is-sticky-start-column">Start</th>
              {visibleWeeks.map((row) => {
                const action = getWeekAction({
                  row,
                  currentWeekNumber,
                  onOpenCurrentWeek,
                  onOpenWeeklyReview,
                  onOpenWeeklyCheckIn,
                })
                return (
                  <th
                    key={row.weekNumber}
                    className={Number(row.weekNumber) === Number(currentWeekNumber) ? 'is-current-column' : undefined}
                  >
                    <WeekColumnHeader
                      label={`W${row.weekNumber}`}
                      action={action}
                      isCurrent={Number(row.weekNumber) === Number(currentWeekNumber)}
                    />
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {metricRows.map((metric) => (
              <tr key={metric.label}>
                <th className="is-sticky-metric-column" scope="row">{metric.label}</th>
                <td className="is-sticky-start-column">{metric.start}</td>
                {visibleWeeks.map((row) => (
                  <td
                    key={row.weekNumber}
                    className={Number(row.weekNumber) === Number(currentWeekNumber) ? 'is-current-column' : undefined}
                  >
                    {metric.status ? (
                      <span className={`progress-table-status is-${String(metric.value(row)).toLowerCase().replaceAll(' ', '-')}`}>
                        {metric.value(row)}
                      </span>
                    ) : metric.value(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hiddenWeekCount > 0 ? (
        <div className="progress-table-actions">
          <button type="button" className="progress-table-toggle" onClick={() => setShowFutureWeeks(true)}>
            Show remaining weeks ({hiddenWeekCount})
          </button>
        </div>
      ) : showFutureWeeks && current < allWeeks.length ? (
        <div className="progress-table-actions">
          <button type="button" className="progress-table-toggle" onClick={() => setShowFutureWeeks(false)}>
            Hide future weeks
          </button>
        </div>
      ) : null}
    </section>
  )
}

function FullMeasurementsTable({ measurements }) {
  const rows = measurements ?? []

  if (rows.length === 0) return null

  const measurementRows = [
    { label: 'Date', value: (row) => formatDate(row.checkinDate) },
    { label: 'Weight', value: (row) => formatWeight(row.weight) },
    { label: 'Body Fat', value: (row) => `${formatMeasurement(row.bodyFat)}${numeric(row.bodyFat) === null ? '' : '%'}` },
    { label: 'Neck', value: (row) => formatMeasurement(row.neck) },
    { label: 'Chest', value: (row) => formatMeasurement(row.chest) },
    { label: 'Waist', value: (row) => formatMeasurement(row.waist) },
    { label: 'Hips', value: (row) => formatMeasurement(row.hips) },
    { label: 'Arm', value: (row) => formatMeasurement(row.arm) },
    { label: 'Thigh', value: (row) => formatMeasurement(row.thigh) },
    { label: 'Calf', value: (row) => formatMeasurement(row.calf) },
  ]

  return (
    <section className="progress-overview-section">
      <div className="progress-overview-section-heading">
        <div>
          <h3>Full Measurements</h3>
          <p>Swipe sideways to compare every full measurement check-in.</p>
        </div>
      </div>

      <div className="progress-table-scroll" tabIndex="0">
        <table className="progress-data-table progress-transposed-table measurement-progress-table">
          <thead>
            <tr>
              <th className="is-sticky-metric-column">Measurement</th>
              {rows.map((row, index) => (
                <th
                  key={`${row.checkpoint}-${row.checkinDate}`}
                  className={index === 0 ? 'is-sticky-start-column' : undefined}
                >
                  {row.checkpoint}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {measurementRows.map((measurement) => (
              <tr key={measurement.label}>
                <th className="is-sticky-metric-column" scope="row">{measurement.label}</th>
                {rows.map((row, index) => (
                  <td
                    key={`${row.checkpoint}-${row.checkinDate}`}
                    className={index === 0 ? 'is-sticky-start-column' : undefined}
                  >
                    {measurement.value(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="progress-table-note">
        Measurements are inches. Arm, thigh, and calf use the plan's selected measurement side.
      </p>
    </section>
  )
}

export function PlanProgressOverview({
  plan,
  currentWeekNumber,
  weeks,
  measurements,
  onOpenCurrentWeek,
  onOpenWeeklyReview,
  onOpenWeeklyCheckIn,
}) {
  return (
    <section className="plan-progress-overview" aria-labelledby="plan-progress-overview-heading">
      <header className="plan-progress-overview-header">
        <h1 id="plan-progress-overview-heading">Plan Progress</h1>
        <p>
          {formatGoal(plan.goal)}
          {currentWeekNumber
            ? ` · Week ${currentWeekNumber} of ${plan.program_length_weeks}`
            : ` · ${plan.program_length_weeks}-Week Plan`}
        </p>
      </header>

      <WeeklyProgressTable
        plan={plan}
        currentWeekNumber={currentWeekNumber}
        weeks={weeks}
        measurements={measurements}
        onOpenCurrentWeek={onOpenCurrentWeek}
        onOpenWeeklyReview={onOpenWeeklyReview}
        onOpenWeeklyCheckIn={onOpenWeeklyCheckIn}
      />

      <FullMeasurementsTable measurements={measurements} />
    </section>
  )
}
