import {
  getReportingWeekRange,
} from '../../utils/dates'
import {
  formatGoal,
} from '../../utils/formatters'

function numeric(value) {
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

function WeeklyProgressTable({
  plan,
  currentWeekNumber,
  weeks,
  onOpenCurrentWeek,
  onOpenWeeklyReview,
  onOpenWeeklyCheckIn,
}) {
  const rows = buildAllWeeks(plan, currentWeekNumber, weeks)

  return (
    <section className="progress-overview-section">
      <div className="progress-overview-section-heading">
        <div>
          <h3>Weekly Progress</h3>
          <p>Swipe sideways to compare every week.</p>
        </div>
      </div>

      <div className="progress-table-scroll" tabIndex="0">
        <table className="progress-data-table weekly-progress-table">
          <thead>
            <tr>
              <th className="is-sticky-column">Week</th>
              <th>Dates</th>
              <th>Avg Weight</th>
              <th>Nutrition</th>
              <th>Workouts</th>
              <th>Cardio</th>
              <th>Consistency</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const action = getWeekAction({
                row,
                currentWeekNumber,
                onOpenCurrentWeek,
                onOpenWeeklyReview,
                onOpenWeeklyCheckIn,
              })

              return (
                <tr
                  key={row.weekNumber}
                  className={
                    Number(row.weekNumber) === Number(currentWeekNumber)
                      ? 'is-current-row'
                      : undefined
                  }
                >
                  <th className="is-sticky-column" scope="row">
                    {action ? (
                      <button
                        type="button"
                        className="progress-week-link"
                        onClick={action}
                        aria-label={`Open Week ${row.weekNumber}`}
                      >
                        W{row.weekNumber}
                        <span aria-hidden="true">›</span>
                      </button>
                    ) : (
                      <span className="progress-week-label">
                        W{row.weekNumber}
                      </span>
                    )}
                  </th>
                  <td>{formatDateRange(row.reportingStart, row.reportingEnd)}</td>
                  <td>{formatWeight(row.averageWeight)}</td>
                  <td>{formatPercent(row.nutritionAdherencePercent)}</td>
                  <td>{formatRatio(row.workoutsCompleted, row.workoutsTarget)}</td>
                  <td>{formatRatio(row.cardioMinutes, row.cardioTarget)}</td>
                  <td>{formatPercent(row.consistencyPercent)}</td>
                  <td>
                    <span className={`progress-table-status is-${String(row.statusLabel).toLowerCase().replaceAll(' ', '-')}`}>
                      {row.statusLabel}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function FullMeasurementsTable({ measurements }) {
  const rows = measurements ?? []

  if (rows.length === 0) return null

  return (
    <section className="progress-overview-section">
      <div className="progress-overview-section-heading">
        <div>
          <h3>Full Measurements</h3>
          <p>Every full measurement check-in, all in one place.</p>
        </div>
      </div>

      <div className="progress-table-scroll" tabIndex="0">
        <table className="progress-data-table measurement-progress-table">
          <thead>
            <tr>
              <th className="is-sticky-column">Check-In</th>
              <th>Date</th>
              <th>Weight</th>
              <th>Body Fat</th>
              <th>Neck</th>
              <th>Chest</th>
              <th>Waist</th>
              <th>Hips</th>
              <th>Arm</th>
              <th>Thigh</th>
              <th>Calf</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.checkpoint}-${row.checkinDate}`}>
                <th className="is-sticky-column" scope="row">
                  <span className="progress-week-label">
                    {row.checkpoint}
                  </span>
                </th>
                <td>{formatDate(row.checkinDate)}</td>
                <td>{formatWeight(row.weight)}</td>
                <td>{formatMeasurement(row.bodyFat)}{numeric(row.bodyFat) === null ? '' : '%'}</td>
                <td>{formatMeasurement(row.neck)}</td>
                <td>{formatMeasurement(row.chest)}</td>
                <td>{formatMeasurement(row.waist)}</td>
                <td>{formatMeasurement(row.hips)}</td>
                <td>{formatMeasurement(row.arm)}</td>
                <td>{formatMeasurement(row.thigh)}</td>
                <td>{formatMeasurement(row.calf)}</td>
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
        onOpenCurrentWeek={onOpenCurrentWeek}
        onOpenWeeklyReview={onOpenWeeklyReview}
        onOpenWeeklyCheckIn={onOpenWeeklyCheckIn}
      />

      <FullMeasurementsTable measurements={measurements} />
    </section>
  )
}
