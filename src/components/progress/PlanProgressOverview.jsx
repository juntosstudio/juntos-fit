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

function formatWeightChangeFromStart(currentWeight, startWeight) {
  const current = numeric(currentWeight)
  const start = numeric(startWeight)

  if (current === null || start === null) return null

  const delta = current - start
  const magnitude = Math.abs(delta).toFixed(1)

  if (Math.abs(delta) < 0.05) {
    return {
      direction: 'flat',
      text: 'No change from Start',
    }
  }

  if (delta < 0) {
    return {
      direction: 'down',
      text: `↓ ${magnitude} lbs from Start`,
    }
  }

  return {
    direction: 'up',
    text: `↑ ${magnitude} lbs from Start`,
  }
}

function WeeklyHistoryCards({
  plan,
  currentWeekNumber,
  weeks,
  measurements,
  onOpenCurrentWeek,
  onOpenWeeklyReview,
  onOpenWeeklyCheckIn,
}) {
  const [showAllWeeks, setShowAllWeeks] = useState(false)
  const allWeeks = buildAllWeeks(plan, currentWeekNumber, weeks)
  const current = Math.max(1, Number(currentWeekNumber) || 1)
  const defaultLastVisibleWeek = Math.min(
    allWeeks.length,
    current + 2,
  )
  const visibleWeeks = showAllWeeks
    ? allWeeks
    : allWeeks.filter((row) => Number(row.weekNumber) <= defaultLastVisibleWeek)
  const hasHiddenWeeks = visibleWeeks.length < allWeeks.length
  const start = (measurements ?? []).find(
    (row) => String(row.checkpoint).toLowerCase() === 'start',
  )
  const startWeight = start?.weight

  function statusFor(row) {
    if (
      row?.weeklyStatus === 'completed' &&
      row?.planAdjustmentStatus === 'proposed'
    ) {
      return {
        label: 'Recommendation Waiting',
        className: 'is-recommendation-waiting',
      }
    }

    const status = row.statusLabel

    if (status === 'Completed') return { label: 'Completed ✓', className: 'is-complete' }
    if (status === 'Current') return { label: 'Current', className: 'is-current' }
    if (status === 'Weekly Overdue') return { label: 'Weekly Overdue', className: 'is-overdue' }
    if (status === 'Needs Review') return { label: 'Needs Review', className: 'is-needs-review' }
    if (status === 'No Weekly') return { label: 'No Weekly Check-In', className: 'is-no-weekly' }
    return { label: 'Upcoming', className: 'is-upcoming' }
  }

  return (
    <section className="progress-overview-section weekly-history-section">
      <div className="progress-overview-section-heading">
        <div>
          <h3>Weekly History</h3>
          <p>Open any completed week to review the full check-in and coaching summary.</p>
        </div>
      </div>

      <div className="weekly-history-list">
        {visibleWeeks.map((row) => {
          const action = getWeekAction({
            row,
            currentWeekNumber,
            onOpenCurrentWeek,
            onOpenWeeklyReview,
            onOpenWeeklyCheckIn,
          })
          const status = statusFor(row)
          const weightChange = formatWeightChangeFromStart(
            row.averageWeight,
            startWeight,
          )
          const hasDailyData = Number(row.dailyCheckInCount) > 0
          const isRecommendationWaiting =
            row?.weeklyStatus === 'completed' &&
            row?.planAdjustmentStatus === 'proposed'
          const rowClass = [
            'weekly-history-card',
            action ? 'is-clickable' : '',
            Number(row.weekNumber) === Number(currentWeekNumber) ? 'is-current' : '',
            row?.weeklyStatus === 'completed' && !isRecommendationWaiting ? 'is-completed' : '',
            isRecommendationWaiting ? 'is-recommendation-waiting' : '',
          ].filter(Boolean).join(' ')

          const content = (
            <>
              <span className="weekly-history-card-content">
                <span className="weekly-history-card-topline">
                  <strong>Week {row.weekNumber}</strong>
                  <span className={`plan-progress-status ${status.className}`}>
                    {status.label}
                  </span>
                </span>

                {isRecommendationWaiting ? (
                  <span className="plan-progress-subtext">Review and decide</span>
                ) : Number(row.weekNumber) === Number(currentWeekNumber) && !row.dailyCheckInCount ? (
                  <span className="plan-progress-subtext">In progress</span>
                ) : hasDailyData || numeric(row.averageWeight) !== null ? (
                  <span className="weekly-history-card-stats">
                    {numeric(row.consistencyPercent) !== null ? (
                      <span>
                        Consistency <strong>{Math.round(Number(row.consistencyPercent))}%</strong>
                      </span>
                    ) : row.dailyCheckInCount ? (
                      <span>
                        Daily Check-Ins <strong>{Number(row.dailyCheckInCount)}</strong>
                      </span>
                    ) : null}

                    {numeric(row.averageWeight) !== null ? (
                      <span>
                        Avg Weight <strong>{formatWeight(row.averageWeight)} lbs</strong>
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <span className="plan-progress-subtext">
                    {status.label === 'Upcoming' ? 'Upcoming' : 'No check-in data recorded'}
                  </span>
                )}

                {weightChange ? (
                  <span className={`weekly-history-weight-change is-${weightChange.direction}`}>
                    {weightChange.text}
                  </span>
                ) : null}
              </span>

              {action ? (
                <span className="plan-progress-chevron" aria-hidden="true">›</span>
              ) : null}
            </>
          )

          if (!action) {
            return (
              <div className={rowClass} key={row.weekNumber}>
                {content}
              </div>
            )
          }

          return (
            <button
              type="button"
              className={rowClass}
              key={row.weekNumber}
              onClick={action}
              aria-label={`Open Week ${row.weekNumber}`}
            >
              {content}
            </button>
          )
        })}
      </div>

      {hasHiddenWeeks ? (
        <div className="weekly-history-actions">
          <button
            type="button"
            className="text-button weekly-history-toggle"
            onClick={() => setShowAllWeeks(true)}
          >
            ••• Show All Weeks
          </button>
        </div>
      ) : showAllWeeks && current + 2 < allWeeks.length ? (
        <div className="weekly-history-actions">
          <button
            type="button"
            className="text-button weekly-history-toggle"
            onClick={() => setShowAllWeeks(false)}
          >
            Show Fewer Weeks
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

      <WeeklyHistoryCards
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
