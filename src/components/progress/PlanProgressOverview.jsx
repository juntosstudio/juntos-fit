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



function mergeWeightHistory(weightHistory, measurements) {
  const start = (measurements ?? []).find(
    (row) => String(row.checkpoint).toLowerCase() === 'start',
  )
  const byDate = new Map()

  if (start?.checkinDate && numeric(start?.weight) !== null) {
    byDate.set(start.checkinDate, {
      checkinDate: start.checkinDate,
      weight: Number(start.weight),
      source: 'start',
    })
  }

  for (const row of weightHistory ?? []) {
    if (!row?.checkinDate || numeric(row?.weight) === null) continue
    byDate.set(row.checkinDate, {
      checkinDate: row.checkinDate,
      weight: Number(row.weight),
      source: 'daily',
    })
  }

  return [...byDate.values()].sort((a, b) =>
    String(a.checkinDate).localeCompare(String(b.checkinDate)),
  )
}

function dateKeyToMs(value) {
  if (!value) return null
  const [year, month, day] = String(value).split('-').map(Number)
  if (!year || !month || !day) return null
  return Date.UTC(year, month - 1, day)
}

function addDaysToDateKey(value, days) {
  const milliseconds = dateKeyToMs(value)
  if (milliseconds === null) return value
  const date = new Date(milliseconds + Number(days) * 86400000)
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

function averageWeightEntries(entries) {
  if (!entries.length) return null
  return entries.reduce((total, entry) => total + Number(entry.weight), 0) / entries.length
}

function buildWeeklyWeightAverages(entries, plan) {
  const length = Number(plan?.program_length_weeks) || 0
  const weeks = []

  for (let weekNumber = 1; weekNumber <= length; weekNumber += 1) {
    const range = getReportingWeekRange(
      plan.start_date,
      plan.checkin_day,
      weekNumber,
    )
    if (!range?.reportingStart || !range?.reportingEnd) continue

    const inRange = entries.filter((entry) =>
      entry.checkinDate >= range.reportingStart &&
      entry.checkinDate <= range.reportingEnd,
    )
    const value = averageWeightEntries(inRange)
    if (value === null) continue

    weeks.push({
      checkinDate: range.reportingEnd,
      weight: value,
      label: `W${weekNumber}`,
    })
  }

  return weeks
}

function filterWeightRange(entries, range, plan) {
  if (!entries.length) return []
  const latestDate = entries.at(-1)?.checkinDate
  const latestMs = dateKeyToMs(latestDate)

  if (range === 'W') {
    return buildWeeklyWeightAverages(entries, plan)
  }

  if (range === 'D') {
    const start = addDaysToDateKey(latestDate, -6)
    return entries.filter((entry) => entry.checkinDate >= start)
  }

  if (range === 'M') {
    const latest = new Date(latestMs)
    const start = [
      latest.getUTCFullYear(),
      String(latest.getUTCMonth() + 1).padStart(2, '0'),
      '01',
    ].join('-')
    return entries.filter((entry) => entry.checkinDate >= start)
  }

  if (range === '6M') {
    const latest = new Date(latestMs)
    latest.setUTCMonth(latest.getUTCMonth() - 6)
    const start = [
      latest.getUTCFullYear(),
      String(latest.getUTCMonth() + 1).padStart(2, '0'),
      String(latest.getUTCDate()).padStart(2, '0'),
    ].join('-')
    return entries.filter((entry) => entry.checkinDate >= start)
  }

  if (range === 'Y') {
    const latest = new Date(latestMs)
    const start = `${latest.getUTCFullYear()}-01-01`
    return entries.filter((entry) => entry.checkinDate >= start)
  }

  if (range === 'PLAN') {
    return entries.filter((entry) => entry.checkinDate >= plan.start_date)
  }

  return entries
}

function buildChartGeometry(entries, width = 620, height = 210) {
  const pad = { left: 20, right: 20, top: 20, bottom: 28 }
  const values = entries.map((entry) => Number(entry.weight)).filter(Number.isFinite)

  if (!values.length) {
    return { points: [], path: '', min: null, max: null, guides: [] }
  }

  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  const padding = Math.max(0.8, (rawMax - rawMin) * 0.18)
  const min = rawMin - padding
  const max = rawMax + padding
  const span = Math.max(0.5, max - min)
  const plotWidth = width - pad.left - pad.right
  const plotHeight = height - pad.top - pad.bottom

  const dated = entries.map((entry) => ({
    ...entry,
    milliseconds: dateKeyToMs(entry.checkinDate),
  }))
  const minDate = Math.min(...dated.map((entry) => entry.milliseconds))
  const maxDate = Math.max(...dated.map((entry) => entry.milliseconds))
  const dateSpan = Math.max(86400000, maxDate - minDate)

  const points = dated.map((entry, index) => {
    const x = entries.length === 1
      ? width / 2
      : pad.left + ((entry.milliseconds - minDate) / dateSpan) * plotWidth
    const y = pad.top + ((max - Number(entry.weight)) / span) * plotHeight
    return { ...entry, index, x, y }
  })

  const path = points.map((point, index) =>
    `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
  ).join(' ')

  const guides = [0, 0.5, 1].map((ratio) => ({
    y: pad.top + ratio * plotHeight,
    value: max - ratio * span,
  }))

  return { points, path, min, max, guides }
}

function WeightLineChart({ entries, selectedDate, onSelect, photoMarkers = [], showPointDates = false }) {
  const geometry = buildChartGeometry(entries)
  const width = 620
  const height = showPointDates ? 244 : 210

  if (!geometry.points.length) {
    return <div className="progress-weight-chart-empty">Log a weight to start your trend.</div>
  }

  const firstDate = entries[0]?.checkinDate
  const lastDate = entries.at(-1)?.checkinDate
  const rangeStart = dateKeyToMs(firstDate)
  const rangeEnd = dateKeyToMs(lastDate)
  const rangeSpan = Math.max(86400000, rangeEnd - rangeStart)
  const photoDates = new Set((photoMarkers ?? []).map((marker) => marker?.checkinDate).filter(Boolean))


  return (
    <div className="progress-weight-chart-wrap">
      <svg
        className="progress-weight-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Weight trend"
      >
        {geometry.guides.map((guide) => (
          <line
            key={guide.y}
            x1="20"
            x2="600"
            y1={guide.y}
            y2={guide.y}
            className="progress-weight-guide"
          />
        ))}

        {geometry.path ? (
          <path d={geometry.path} className="progress-weight-line" />
        ) : null}

        {geometry.points.map((point) => {
          const selected = selectedDate === point.checkinDate
          const hasPhoto = photoDates.has(point.checkinDate)
          const pointClassName = [
            'progress-weight-point',
            selected ? 'is-selected' : '',
            hasPhoto ? 'has-photo' : '',
          ].filter(Boolean).join(' ')
          return (
            <circle
              key={`${point.checkinDate}-${point.index}`}
              cx={point.x}
              cy={point.y}
              r={selected ? 7 : hasPhoto ? 6 : 5}
              className={pointClassName}
              onClick={() => onSelect?.(point)}
            />
          )
        })}

        {photoMarkers
          .filter((marker) => marker?.checkinDate >= firstDate && marker?.checkinDate <= lastDate)
          .map((marker) => {
            const markerMs = dateKeyToMs(marker.checkinDate)
            const x = 20 + ((markerMs - rangeStart) / rangeSpan) * 580
            return (
              <g key={marker.key ?? `${marker.checkpoint}-${marker.checkinDate}`} className="progress-photo-marker">
                <line x1={x} x2={x} y1="174" y2="187" className="progress-photo-marker-line" />
                <circle cx={x} cy="191" r="9" className="progress-photo-marker-dot" />
                <path d={`M ${x - 4} 191 h 8 M ${x} 187 v 8`} className="progress-photo-marker-plus" />
              </g>
            )
          })}

        {showPointDates ? geometry.points.map((point) => (
          <g key={`date-${point.checkinDate}-${point.index}`} className="progress-weight-date-tick">
            <line x1={point.x} x2={point.x} y1="199" y2="204" />
            <text
              x={point.x}
              y="218"
              textAnchor="end"
              transform={`rotate(-38 ${point.x} 218)`}
            >
              {formatDate(point.checkinDate)}
            </text>
          </g>
        )) : null}
      </svg>

      {!showPointDates ? (
        <div className="progress-weight-chart-axis is-sparse">
          {(() => {
            const labels = []
            const startMs = dateKeyToMs(firstDate)
            const endMs = dateKeyToMs(lastDate)
            const weekMs = 7 * 86400000
            for (let ms = startMs; ms <= endMs; ms += weekMs) {
              labels.push(ms)
            }
            if (!labels.length || labels.at(-1) !== endMs) labels.push(endMs)
            return labels.map((ms, index) => (
              <span
                key={`axis-${ms}`}
                className={index === 0 ? 'is-first' : index === labels.length - 1 ? 'is-last' : ''}
                style={{ left: `${((ms - startMs) / Math.max(86400000, endMs - startMs)) * 100}%` }}
              >
                {formatDate(new Date(ms).toISOString().slice(0, 10))}
              </span>
            ))
          })()}
        </div>
      ) : null}
    </div>
  )
}

function WeightDashboardCard({ plan, measurements, weightHistory, onOpen }) {
  const entries = mergeWeightHistory(weightHistory, measurements)
  const start = entries[0] ?? null
  const latest = entries.at(-1) ?? null
  const change = formatWeightChangeFromStart(latest?.weight, start?.weight)

  return (
    <section className="progress-weight-hero" aria-labelledby="progress-weight-heading">
      <button type="button" className="progress-weight-hero-button" onClick={onOpen} aria-label="Open Weight Progress">
        <span className="progress-weight-hero-copy">
          <span className="progress-dashboard-kicker" id="progress-weight-heading">Weight</span>
          <span className="progress-weight-current">
            {latest ? formatWeight(latest.weight) : '—'}
            {latest ? <small> lbs</small> : null}
          </span>
          {change ? (
            <span className={`progress-weight-change is-${change.direction}`}>{change.text}</span>
          ) : null}
        </span>
        <span className="progress-dashboard-chevron" aria-hidden="true">›</span>
      </button>

      <WeightLineChart entries={entries} />

      {start && latest ? (
        <div className="progress-weight-hero-footer">
          <span>Start {formatWeight(start.weight)}</span>
          <span>Current plan</span>
        </div>
      ) : null}
    </section>
  )
}

function WeightProgressDetail({ plan, measurements, weightHistory, allWeightHistory, photoMarkers, onBack }) {
  const [range, setRange] = useState('PLAN')
  const planEntries = mergeWeightHistory(weightHistory, measurements)
  const historicalEntries = (allWeightHistory ?? []).length > 0
    ? allWeightHistory
    : planEntries
  const baseEntries = ['6M', 'Y', 'ALL'].includes(range)
    ? historicalEntries
    : planEntries
  const entries = filterWeightRange(baseEntries, range, plan)
  const [selectedDate, setSelectedDate] = useState(null)
  const selected = entries.find((entry) => entry.checkinDate === selectedDate) ?? entries.at(-1) ?? null
  const start = planEntries[0] ?? null
  const latest = planEntries.at(-1) ?? null
  const planChange = formatWeightChangeFromStart(latest?.weight, start?.weight)
  const weeklyAverage = averageWeightEntries(entries)
  const displayValue = range === 'W' && weeklyAverage !== null
    ? weeklyAverage
    : selected?.weight ?? latest?.weight ?? null

  function rangeLabel() {
    if (range === 'D') return 'Last 7 Days'
    if (range === 'W') return 'Weekly Averages'
    if (range === 'M') return 'This Month'
    if (range === '6M') return 'Last 6 Months'
    if (range === 'Y') return 'This Year'
    if (range === 'PLAN') return 'Current Plan'
    return 'All Available Data'
  }

  return (
    <section className="weight-progress-detail" aria-labelledby="weight-progress-detail-heading">
      <button type="button" className="text-button" onClick={onBack}>← Back to Plan Progress</button>

      <header className="weight-progress-detail-header">
        <div>
          <h1 id="weight-progress-detail-heading">Weight Progress</h1>
          <p>{entries.length ? `${formatDate(entries[0].checkinDate)} – ${formatDate(entries.at(-1).checkinDate)}` : 'No weight data yet'}</p>
        </div>
        <button type="button" className="weight-progress-calendar-button" aria-label="Choose date" title="Calendar view coming next">▦</button>
      </header>

      <div className="weight-progress-range-tabs" aria-label="Weight chart range">
        {['D', 'W', 'M', '6M', 'Y', 'PLAN', 'ALL'].map((option) => (
          <button
            type="button"
            key={option}
            className={range === option ? 'is-active' : ''}
            aria-pressed={range === option}
            onClick={() => {
              setRange(option)
              setSelectedDate(null)
            }}
          >
            {option}
          </button>
        ))}
      </div>

      <section className="weight-progress-chart-card">
        <div className="weight-progress-summary-row">
          <div>
            <span className="progress-dashboard-kicker">{rangeLabel()}</span>
            <strong className="weight-progress-summary-value">
              {displayValue === null ? '—' : formatWeight(displayValue)}
              {displayValue !== null ? <small> lbs</small> : null}
            </strong>
            {range === 'PLAN' && planChange ? (
              <span className={`progress-weight-change is-${planChange.direction}`}>{planChange.text.replace(' from Start', '')}</span>
            ) : null}
          </div>
          {start ? (
            <div className="weight-progress-start-stat">
              <span>Start</span>
              <strong>{formatWeight(start.weight)} lbs</strong>
            </div>
          ) : null}
        </div>

        <WeightLineChart
          entries={entries}
          selectedDate={selected?.checkinDate ?? null}
          onSelect={(point) => setSelectedDate(point.checkinDate)}
          photoMarkers={photoMarkers}
          showPointDates
        />

        {photoMarkers?.length ? (
          <p className="weight-progress-photo-note">Progress-photo markers appear on the dates photos were logged.</p>
        ) : null}
      </section>

      {selected ? (
        <section className="weight-progress-selected-entry">
          <div>
            <span className="progress-dashboard-kicker">Selected Entry</span>
            <strong>{formatWeight(selected.weight)} lbs</strong>
            <span>{formatDate(selected.checkinDate)}</span>
          </div>
          {photoMarkers?.some((marker) => marker.checkinDate === selected.checkinDate) ? (
            <span className="weight-progress-selected-photo" aria-label="Progress photo available">◉</span>
          ) : null}
        </section>
      ) : null}
    </section>
  )
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
  weightHistory,
  allWeightHistory,
  photoMarkers,
  onOpenCurrentWeek,
  onOpenWeeklyReview,
  onOpenWeeklyCheckIn,
}) {
  const [detailView, setDetailView] = useState(null)

  if (detailView === 'weight') {
    return (
      <WeightProgressDetail
        plan={plan}
        measurements={measurements}
        weightHistory={weightHistory}
        allWeightHistory={allWeightHistory}
        photoMarkers={photoMarkers}
        onBack={() => setDetailView(null)}
      />
    )
  }

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

      <section className="progress-dashboard-section">
        <WeightDashboardCard
          plan={plan}
          measurements={measurements}
          weightHistory={weightHistory}
          onOpen={() => setDetailView('weight')}
        />
      </section>

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
