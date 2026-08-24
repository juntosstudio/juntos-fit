import { useRef, useState } from 'react'
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
  const entries = []

  if (start?.checkinDate && numeric(start?.weight) !== null) {
    entries.push({
      checkinDate: start.checkinDate,
      weight: Number(start.weight),
      source: 'start',
    })
  }

  for (const row of weightHistory ?? []) {
    if (!row?.checkinDate || numeric(row?.weight) === null) continue
    entries.push({
      checkinDate: row.checkinDate,
      weight: Number(row.weight),
      source: row.source ?? 'daily',
    })
  }

  return entries.sort((a, b) =>
    String(a.checkinDate).localeCompare(String(b.checkinDate)),
  )
}

function dateKeyToMs(value) {
  if (!value) return null
  const [year, month, day] = String(value).split('-').map(Number)
  if (!year || !month || !day) return null
  return Date.UTC(year, month - 1, day)
}

function msToDateKey(milliseconds) {
  if (!Number.isFinite(milliseconds)) return null
  const date = new Date(milliseconds)
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

function addDaysToDateKey(value, days) {
  const milliseconds = dateKeyToMs(value)
  if (milliseconds === null) return value
  return msToDateKey(milliseconds + Number(days) * 86400000)
}

function addMonthsToDateKey(value, months) {
  const milliseconds = dateKeyToMs(value)
  if (milliseconds === null) return value
  const date = new Date(milliseconds)
  const day = date.getUTCDate()
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + Number(months))
  const lastDay = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    0,
  )).getUTCDate()
  date.setUTCDate(Math.min(day, lastDay))
  return msToDateKey(date.getTime())
}

function startOfCalendarWeek(value) {
  const milliseconds = dateKeyToMs(value)
  if (milliseconds === null) return value
  const date = new Date(milliseconds)
  return addDaysToDateKey(value, -date.getUTCDay())
}

function startOfMonth(value) {
  const milliseconds = dateKeyToMs(value)
  if (milliseconds === null) return value
  const date = new Date(milliseconds)
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    '01',
  ].join('-')
}

function endOfMonth(value) {
  const milliseconds = dateKeyToMs(value)
  if (milliseconds === null) return value
  const date = new Date(milliseconds)
  return msToDateKey(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    0,
  ))
}

function daysBetween(start, end) {
  const startMs = dateKeyToMs(start)
  const endMs = dateKeyToMs(end)
  if (startMs === null || endMs === null) return 0
  return Math.max(0, Math.round((endMs - startMs) / 86400000))
}

function averageWeightEntries(entries) {
  if (!entries.length) return null
  return entries.reduce((total, entry) => total + Number(entry.weight), 0) / entries.length
}

function aggregateWeightEntries(entries, granularity) {
  if (!entries.length) return []
  const groups = new Map()

  for (const entry of entries) {
    if (!entry?.checkinDate || numeric(entry?.weight) === null) continue

    let key = entry.checkinDate
    let periodStart = entry.checkinDate
    let periodEnd = entry.checkinDate

    if (granularity === 'week') {
      periodStart = startOfCalendarWeek(entry.checkinDate)
      periodEnd = addDaysToDateKey(periodStart, 6)
      key = periodStart
    } else if (granularity === 'month') {
      periodStart = startOfMonth(entry.checkinDate)
      periodEnd = endOfMonth(entry.checkinDate)
      key = periodStart
    }

    const group = groups.get(key) ?? {
      entries: [],
      periodStart,
      periodEnd,
    }
    group.entries.push(entry)
    groups.set(key, group)
  }

  return [...groups.values()]
    .map((group) => ({
      checkinDate: group.periodStart,
      periodStart: group.periodStart,
      periodEnd: group.periodEnd,
      weight: averageWeightEntries(group.entries),
      sampleCount: group.entries.length,
      bucket: granularity,
    }))
    .sort((a, b) => String(a.checkinDate).localeCompare(String(b.checkinDate)))
}

function buildWeightRange(rawEntries, range, plan, windowOffset = 0) {
  const entries = [...(rawEntries ?? [])]
    .filter((entry) => entry?.checkinDate && numeric(entry?.weight) !== null)
    .sort((a, b) => String(a.checkinDate).localeCompare(String(b.checkinDate)))

  if (!entries.length) {
    return {
      entries: [],
      rangeStart: null,
      rangeEnd: null,
      granularity: 'day',
      averageWeight: null,
      earliestDate: null,
      latestDate: null,
    }
  }

  const earliestDate = entries[0].checkinDate
  const latestDate = entries.at(-1).checkinDate
  let rangeStart = earliestDate
  let rangeEnd = latestDate
  let granularity = 'day'

  if (range === 'D') {
    rangeEnd = addDaysToDateKey(latestDate, Number(windowOffset))
    rangeStart = rangeEnd
  } else if (range === 'W') {
    rangeEnd = addDaysToDateKey(latestDate, Number(windowOffset) * 7)
    rangeStart = addDaysToDateKey(rangeEnd, -6)
  } else if (range === 'M') {
    rangeEnd = addDaysToDateKey(latestDate, Number(windowOffset) * 30)
    rangeStart = addDaysToDateKey(rangeEnd, -29)
  } else if (range === '6M') {
    rangeEnd = addMonthsToDateKey(latestDate, Number(windowOffset))
    rangeStart = addMonthsToDateKey(rangeEnd, -6)
    granularity = 'week'
  } else if (range === 'Y') {
    rangeEnd = addMonthsToDateKey(latestDate, Number(windowOffset))
    rangeStart = addMonthsToDateKey(rangeEnd, -12)
    granularity = 'month'
  } else if (range === 'PLAN') {
    rangeStart = plan?.start_date ?? earliestDate
  } else if (range === 'ALL') {
    const span = daysBetween(earliestDate, latestDate)
    if (span > 540) {
      granularity = 'month'
    } else if (span > 120) {
      granularity = 'week'
    }
  }

  const filtered = entries.filter((entry) =>
    entry.checkinDate >= rangeStart && entry.checkinDate <= rangeEnd,
  )

  return {
    entries: aggregateWeightEntries(filtered, granularity),
    rangeStart,
    rangeEnd,
    granularity,
    averageWeight: averageWeightEntries(filtered),
    earliestDate,
    latestDate,
  }
}

function formatLongDate(value) {
  const milliseconds = dateKeyToMs(value)
  if (milliseconds === null) return value ?? '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(milliseconds))
}

function formatLongDateRange(start, end) {
  if (!start && !end) return '—'
  if (!start || start === end) return formatLongDate(start ?? end)
  return formatWeekRange(start, end)
}

function formatMonthYear(value) {
  const milliseconds = dateKeyToMs(value)
  if (milliseconds === null) return value ?? '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(milliseconds))
}

function formatWeekRange(start, end) {
  const startMs = dateKeyToMs(start)
  const endMs = dateKeyToMs(end)
  if (startMs === null || endMs === null) return formatLongDate(start ?? end)

  const startDate = new Date(startMs)
  const endDate = new Date(endMs)
  const sameYear = startDate.getUTCFullYear() === endDate.getUTCFullYear()
  const sameMonth = sameYear && startDate.getUTCMonth() === endDate.getUTCMonth()

  if (sameMonth) {
    const month = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      timeZone: 'UTC',
    }).format(startDate)
    return `${month} ${startDate.getUTCDate()}–${endDate.getUTCDate()}, ${endDate.getUTCFullYear()}`
  }

  if (sameYear) {
    const startPart = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(startDate)
    const endPart = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(endDate)
    return `${startPart}–${endPart}`
  }

  return `${formatLongDate(start)}–${formatLongDate(end)}`
}

function formatSelectedPeriod(entry) {
  if (!entry) return '—'
  if (entry.bucket === 'month') return formatMonthYear(entry.periodStart)
  if (entry.bucket === 'week') return formatWeekRange(entry.periodStart, entry.periodEnd)
  return formatLongDate(entry.periodStart ?? entry.checkinDate)
}

function formatWeekday(value) {
  const milliseconds = dateKeyToMs(value)
  if (milliseconds === null) return ''
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(new Date(milliseconds))
}

function formatMonthShort(value) {
  const milliseconds = dateKeyToMs(value)
  if (milliseconds === null) return ''
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(milliseconds))
}

function buildChartGeometry(
  entries,
  width = 620,
  height = 280,
  { rangeStart = null, rangeEnd = null, detail = false } = {},
) {
  const pad = detail
    ? { left: 20, right: 48, top: 100, bottom: 42 }
    : { left: 20, right: 20, top: 20, bottom: 28 }
  const values = entries.map((entry) => Number(entry.weight)).filter(Number.isFinite)

  if (!values.length) {
    return { points: [], path: '', min: null, max: null, guides: [], pad }
  }

  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  let min
  let max
  let guides

  if (detail) {
    min = Math.floor(rawMin / 10) * 10
    max = Math.ceil(rawMax / 10) * 10

    if (min === max) {
      min -= 10
      max += 10
    }

    while (max - min < 20) {
      max += 10
    }

    if (rawMax >= max - 0.5) max += 10
    if (rawMin <= min + 0.5) min -= 10

    guides = []
    for (let value = max; value >= min; value -= 10) {
      guides.push({ value })
    }
  } else {
    const padding = Math.max(0.8, (rawMax - rawMin) * 0.18)
    min = rawMin - padding
    max = rawMax + padding
    guides = [
      { value: max },
      { value: max - (max - min) * 0.5 },
      { value: min },
    ]
  }

  const span = Math.max(0.5, max - min)
  const plotWidth = width - pad.left - pad.right
  const plotHeight = height - pad.top - pad.bottom

  guides = guides.map((guide) => ({
    ...guide,
    y: pad.top + ((max - Number(guide.value)) / span) * plotHeight,
  }))

  const dated = entries.map((entry) => ({
    ...entry,
    milliseconds: dateKeyToMs(entry.checkinDate),
  }))
  const dataMinDate = Math.min(...dated.map((entry) => entry.milliseconds))
  const dataMaxDate = Math.max(...dated.map((entry) => entry.milliseconds))
  const minDate = dateKeyToMs(rangeStart) ?? dataMinDate
  const maxDate = dateKeyToMs(rangeEnd) ?? dataMaxDate
  const dateSpan = Math.max(86400000, maxDate - minDate)

  const points = dated.map((entry, index) => {
    const xRatio = Math.min(1, Math.max(0, (entry.milliseconds - minDate) / dateSpan))
    const x = minDate === maxDate
      ? pad.left + plotWidth / 2
      : pad.left + xRatio * plotWidth
    const y = pad.top + ((max - Number(entry.weight)) / span) * plotHeight
    return { ...entry, index, x, y }
  })

  const path = points.length > 1
    ? points.map((point, index) =>
        `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
      ).join(' ')
    : ''

  return {
    points,
    path,
    min,
    max,
    guides,
    pad,
    minDate,
    maxDate,
    plotWidth,
    plotHeight,
  }
}

function buildAxisTicks(range, rangeStart, rangeEnd, granularity) {
  const startMs = dateKeyToMs(rangeStart)
  const endMs = dateKeyToMs(rangeEnd)
  if (startMs === null || endMs === null) return []

  const ticks = []

  if (range === 'D') {
    return [{ date: rangeStart, label: formatDate(rangeStart) }]
  }

  if (range === 'W') {
    for (let date = rangeStart; date <= rangeEnd; date = addDaysToDateKey(date, 1)) {
      ticks.push({ date, label: formatWeekday(date) })
    }
    return ticks
  }

  if (range === 'M' || range === 'PLAN' || (range === 'ALL' && granularity === 'day')) {
    const step = 7
    for (let date = rangeStart; date <= rangeEnd; date = addDaysToDateKey(date, step)) {
      ticks.push({ date, label: formatDate(date) })
    }
    const lastTick = ticks.at(-1)?.date
    if (!lastTick || daysBetween(lastTick, rangeEnd) >= 4) {
      ticks.push({ date: rangeEnd, label: formatDate(rangeEnd) })
    }
    return ticks
  }

  if (range === 'Y') {
    let cursor = startOfMonth(rangeStart)
    while (cursor <= rangeEnd) {
      ticks.push({
        date: cursor,
        label: formatMonthShort(cursor).slice(0, 1),
      })
      cursor = addMonthsToDateKey(cursor, 1)
    }
    return ticks
  }

  if (range === '6M' || granularity === 'week') {
    let cursor = startOfMonth(rangeStart)
    while (cursor <= rangeEnd) {
      ticks.push({ date: cursor, label: formatMonthShort(cursor) })
      cursor = addMonthsToDateKey(cursor, 1)
    }
    return ticks
  }

  let cursor = startOfMonth(rangeStart)
  let index = 0
  while (cursor <= rangeEnd) {
    if (index % 2 === 0) {
      const date = new Date(dateKeyToMs(cursor))
      ticks.push({
        date: cursor,
        label: `${formatMonthShort(cursor)} '${String(date.getUTCFullYear()).slice(-2)}`,
      })
    }
    cursor = addMonthsToDateKey(cursor, 1)
    index += 1
  }
  return ticks
}


function WeightLineChart({
  entries,
  selectedDate = null,
  onSelect,
  onPanRange = null,
  photoMarkers = [],
  detail = false,
  range = 'PLAN',
  rangeStart = null,
  rangeEnd = null,
  granularity = 'day',
}) {
  const svgRef = useRef(null)
  const pointerStateRef = useRef(null)
  const longPressTimerRef = useRef(null)
  const lastWheelPanRef = useRef(0)
  const width = 620
  const height = detail ? 280 : 210
  const geometry = buildChartGeometry(entries, width, height, {
    rangeStart,
    rangeEnd,
    detail,
  })

  const firstDate = rangeStart ?? entries[0]?.checkinDate
  const lastDate = rangeEnd ?? entries.at(-1)?.checkinDate
  const rangeStartMs = dateKeyToMs(firstDate)
  const rangeEndMs = dateKeyToMs(lastDate)
  const rangeSpan = Math.max(86400000, (rangeEndMs ?? 0) - (rangeStartMs ?? 0))

  if (!geometry.points.length) {
    return <div className="progress-weight-chart-empty">No weight data in this range.</div>
  }

  const photoDates = new Set((photoMarkers ?? []).map((marker) => marker?.checkinDate).filter(Boolean))
  const selectedPoint = geometry.points.find((point) => point.checkinDate === selectedDate) ?? null
  const axisTicks = detail
    ? buildAxisTicks(range, firstDate, lastDate, granularity)
    : []

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  function pointForClientX(clientX) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect?.width) return null
    const svgX = ((clientX - rect.left) / rect.width) * width
    return geometry.points.reduce((nearest, point) => {
      if (!nearest) return point
      return Math.abs(point.x - svgX) < Math.abs(nearest.x - svgX)
        ? point
        : nearest
    }, null)
  }

  function selectFromClientX(clientX) {
    const point = pointForClientX(clientX)
    if (point) onSelect?.(point)
  }

  function handlePointerDown(event) {
    if (!detail || !onSelect) return

    const isMouse = event.pointerType === 'mouse'
    pointerStateRef.current = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      lastX: event.clientX,
      mode: isMouse ? 'scrub' : 'pending',
    }

    svgRef.current?.setPointerCapture?.(event.pointerId)

    if (isMouse) {
      selectFromClientX(event.clientX)
      return
    }

    longPressTimerRef.current = setTimeout(() => {
      const state = pointerStateRef.current
      if (!state || state.mode !== 'pending') return
      state.mode = 'scrub'
      selectFromClientX(state.lastX)
    }, 280)
  }

  function handlePointerMove(event) {
    if (!detail) return
    const state = pointerStateRef.current
    if (!state || state.pointerId !== event.pointerId) return

    state.lastX = event.clientX
    const deltaX = event.clientX - state.startX

    if (state.pointerType === 'mouse' || state.mode === 'scrub') {
      selectFromClientX(event.clientX)
      return
    }

    if (state.mode === 'pending' && Math.abs(deltaX) > 12) {
      clearLongPressTimer()
      if (onPanRange) {
        state.mode = 'pan'
      } else {
        state.mode = 'scrub'
        selectFromClientX(event.clientX)
      }
    }
  }

  function handlePointerEnd(event) {
    const state = pointerStateRef.current
    clearLongPressTimer()

    if (state && state.pointerId === event.pointerId && state.pointerType !== 'mouse') {
      const deltaX = event.clientX - state.startX

      if (state.mode === 'pending' && Math.abs(deltaX) <= 12) {
        selectFromClientX(event.clientX)
      } else if (state.mode === 'pan' && Math.abs(deltaX) >= 30) {
        onPanRange?.(deltaX > 0 ? -1 : 1)
      }
    }

    pointerStateRef.current = null

    if (svgRef.current?.hasPointerCapture?.(event.pointerId)) {
      svgRef.current.releasePointerCapture(event.pointerId)
    }
  }

  function handleWheel(event) {
    if (!detail || !onPanRange) return
    const horizontalDelta = Math.abs(event.deltaX) >= Math.abs(event.deltaY)
      ? event.deltaX
      : event.shiftKey
        ? event.deltaY
        : 0

    if (Math.abs(horizontalDelta) < 8) return

    const now = Date.now()
    if (now - lastWheelPanRef.current < 220) return
    lastWheelPanRef.current = now
    event.preventDefault()
    onPanRange(horizontalDelta > 0 ? 1 : -1)
  }

  function handleKeyDown(event) {
    if (!detail || !onSelect || !geometry.points.length) return

    if (event.key === 'PageUp' && onPanRange) {
      event.preventDefault()
      onPanRange(-1)
      return
    }

    if (event.key === 'PageDown' && onPanRange) {
      event.preventDefault()
      onPanRange(1)
      return
    }

    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
    event.preventDefault()

    const currentIndex = selectedDate
      ? Math.max(0, geometry.points.findIndex((point) => point.checkinDate === selectedDate))
      : geometry.points.length - 1
    const nextIndex = event.key === 'ArrowLeft'
      ? Math.max(0, currentIndex - 1)
      : Math.min(geometry.points.length - 1, currentIndex + 1)
    onSelect(geometry.points[nextIndex])
  }

  function xForDate(date) {
    const milliseconds = dateKeyToMs(date)
    if (milliseconds === null) return geometry.pad.left
    if (rangeStartMs === rangeEndMs) return geometry.pad.left + geometry.plotWidth / 2
    const ratio = Math.min(1, Math.max(0, (milliseconds - rangeStartMs) / rangeSpan))
    return geometry.pad.left + ratio * geometry.plotWidth
  }

  const visiblePhotoMarkers = detail && ['D', 'W', 'M', 'PLAN'].includes(range)
    ? (photoMarkers ?? []).filter((marker) =>
        marker?.checkinDate >= firstDate && marker?.checkinDate <= lastDate,
      )
    : []

  return (
    <div className={`progress-weight-chart-wrap${detail ? ' is-detail' : ''}`}>
      <svg
        ref={svgRef}
        className="progress-weight-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={detail
          ? 'Interactive weight trend. Tap or click to select. Swipe horizontally to browse time ranges, or press and hold to scrub.'
          : 'Weight trend'}
        tabIndex={detail ? 0 : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
      >
        {detail ? (
          <rect
            x="0"
            y="0"
            width={width}
            height={height}
            className="progress-weight-hit-area"
          />
        ) : null}

        {geometry.guides.map((guide) => (
          <g key={`guide-${guide.value}`} className="progress-weight-guide-group">
            <line
              x1={geometry.pad.left}
              x2={width - geometry.pad.right}
              y1={guide.y}
              y2={guide.y}
              className="progress-weight-guide"
            />
            {detail ? (
              <text
                x={width - 4}
                y={guide.y + 3.5}
                textAnchor="end"
                className="progress-weight-y-label"
              >
                {Math.round(guide.value)}
              </text>
            ) : null}
          </g>
        ))}

        {detail ? axisTicks.map((tick, index) => {
          const x = xForDate(tick.date)
          return (
            <line
              key={`vertical-guide-${tick.date}-${index}`}
              x1={x}
              x2={x}
              y1={geometry.pad.top}
              y2={height - geometry.pad.bottom}
              className="progress-weight-vertical-guide"
            />
          )
        }) : null}

        {selectedPoint ? (
          <line
            x1={selectedPoint.x}
            x2={selectedPoint.x}
            y1={detail ? 64 : geometry.pad.top - 8}
            y2={height - geometry.pad.bottom}
            className="progress-weight-selection-line"
          />
        ) : null}

        {geometry.path ? (
          <path d={geometry.path} className="progress-weight-line" />
        ) : null}

        {geometry.points.map((point) => {
          const selected = selectedDate === point.checkinDate
          const hasPhoto = point.bucket === 'day' && photoDates.has(point.checkinDate)
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
              r={selected ? 6.2 : 4.4}
              className={pointClassName}
              onClick={() => onSelect?.(point)}
            />
          )
        })}

        {visiblePhotoMarkers.map((marker) => {
          const x = xForDate(marker.checkinDate)
          const markerY = height - geometry.pad.bottom + 15
          const matchingPoint = geometry.points.find((point) =>
            point.periodStart <= marker.checkinDate && point.periodEnd >= marker.checkinDate,
          ) ?? geometry.points.reduce((nearest, point) => {
            if (!nearest) return point
            return Math.abs(dateKeyToMs(point.checkinDate) - dateKeyToMs(marker.checkinDate)) <
              Math.abs(dateKeyToMs(nearest.checkinDate) - dateKeyToMs(marker.checkinDate))
              ? point
              : nearest
          }, null)

          return (
            <g
              key={marker.key ?? `${marker.checkpoint}-${marker.checkinDate}`}
              className="progress-photo-marker"
              role="button"
              aria-label={`Select ${formatLongDate(marker.checkinDate)} progress photo entry`}
              tabIndex="0"
              onClick={(event) => {
                event.stopPropagation()
                if (matchingPoint) onSelect?.(matchingPoint)
              }}
              onKeyDown={(event) => {
                if (!['Enter', ' '].includes(event.key)) return
                event.preventDefault()
                event.stopPropagation()
                if (matchingPoint) onSelect?.(matchingPoint)
              }}
            >
              <line
                x1={x}
                x2={x}
                y1={height - geometry.pad.bottom}
                y2={markerY - 10}
                className="progress-photo-marker-line"
              />
              <circle cx={x} cy={markerY} r="10" className="progress-photo-marker-dot" />
              <rect
                x={x - 5.4}
                y={markerY - 3.2}
                width="10.8"
                height="7.4"
                rx="1.5"
                className="progress-photo-marker-camera"
              />
              <path
                d={`M ${x - 3.3} ${markerY - 3.3} L ${x - 2.1} ${markerY - 5.3} H ${x + 2.1} L ${x + 3.3} ${markerY - 3.3}`}
                className="progress-photo-marker-camera-top"
              />
              <circle cx={x} cy={markerY + 0.5} r="2.25" className="progress-photo-marker-lens" />
            </g>
          )
        })}

        {detail ? axisTicks.map((tick, index) => {
          const x = xForDate(tick.date)
          return (
            <g key={`axis-${tick.date}-${index}`} className="progress-weight-date-tick">
              <line
                x1={x}
                x2={x}
                y1={height - geometry.pad.bottom}
                y2={height - geometry.pad.bottom + 5}
              />
              <text
                x={x}
                y={height - 8}
                textAnchor={index === 0 ? 'start' : index === axisTicks.length - 1 ? 'end' : 'middle'}
              >
                {tick.label}
              </text>
            </g>
          )
        }) : null}
      </svg>

      {detail && selectedPoint ? (
        <div
          className={`progress-weight-html-tooltip${selectedPoint.x < 105 ? ' is-start' : selectedPoint.x > 500 ? ' is-end' : ''}`}
          style={{ left: `${(selectedPoint.x / width) * 100}%` }}
          role="tooltip"
        >
          <span className="progress-weight-tooltip-label">AVERAGE</span>
          <strong className="progress-weight-tooltip-value">
            {formatWeight(selectedPoint.weight)}
            <small> lbs</small>
          </strong>
          <span className="progress-weight-tooltip-date">{formatSelectedPeriod(selectedPoint)}</span>
        </div>
      ) : null}

      {!detail ? (
        <div className="progress-weight-chart-axis is-sparse">
          {(() => {
            const labels = []
            const startMs = dateKeyToMs(firstDate)
            const endMs = dateKeyToMs(lastDate)
            const weekMs = 7 * 86400000
            for (let ms = startMs; ms <= endMs; ms += weekMs) {
              labels.push(ms)
            }
            const lastWeekly = labels.at(-1)
            if (lastWeekly !== endMs) {
              if (lastWeekly && endMs - lastWeekly < 4 * 86400000) {
                labels.pop()
              }
              labels.push(endMs)
            }
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
  const [rangeOffset, setRangeOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState(null)
  const planEntries = mergeWeightHistory(weightHistory, measurements)
  const historicalEntries = (allWeightHistory ?? []).length > 0
    ? mergeWeightHistory(allWeightHistory, [])
    : planEntries
  const rawEntries = range === 'PLAN'
    ? planEntries
    : historicalEntries
  const series = buildWeightRange(rawEntries, range, plan, rangeOffset)
  const entries = series.entries
  const selected = selectedDate
    ? entries.find((entry) => entry.checkinDate === selectedDate) ?? null
    : null
  const start = planEntries[0] ?? null
  const latest = planEntries.at(-1) ?? null
  const planChange = formatWeightChangeFromStart(latest?.weight, start?.weight)
  const selectedMarker = selected
    ? (photoMarkers ?? []).find((marker) =>
        marker.checkinDate >= selected.periodStart && marker.checkinDate <= selected.periodEnd,
      ) ?? null
    : null
  const canPanRange = !['PLAN', 'ALL'].includes(range)

  function selectOffset(offset) {
    if (!entries.length) return
    const currentIndex = selected
      ? entries.findIndex((entry) => entry.checkinDate === selected.checkinDate)
      : entries.length - 1
    const nextIndex = Math.min(entries.length - 1, Math.max(0, currentIndex + offset))
    setSelectedDate(entries[nextIndex].checkinDate)
  }

  function panRange(direction) {
    if (!canPanRange || !rawEntries.length) return
    const step = direction < 0 ? -1 : 1
    if (step > 0 && rangeOffset >= 0) return

    let candidateOffset = rangeOffset
    const searchLimit = range === 'D' ? 370 : 30

    for (let attempt = 0; attempt < searchLimit; attempt += 1) {
      candidateOffset += step
      if (candidateOffset > 0) return

      const candidate = buildWeightRange(rawEntries, range, plan, candidateOffset)
      const overlapsHistory = candidate.rangeEnd >= candidate.earliestDate &&
        candidate.rangeStart <= candidate.latestDate

      if (!overlapsHistory) return

      if (candidate.entries.length > 0) {
        setRangeOffset(candidateOffset)
        setSelectedDate(null)
        return
      }
    }
  }

  const summaryPeriod = formatLongDateRange(series.rangeStart, series.rangeEnd)

  return (
    <section className="weight-progress-detail" aria-labelledby="weight-progress-detail-heading">
      <button type="button" className="text-button" onClick={onBack}>← Back to Plan Progress</button>

      <header className="weight-progress-detail-header">
        <div>
          <h1 id="weight-progress-detail-heading">Weight Progress</h1>
          <p>{series.rangeStart && series.rangeEnd ? formatDateRange(series.rangeStart, series.rangeEnd) : 'No weight data yet'}</p>
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
              setRangeOffset(0)
              setSelectedDate(null)
            }}
          >
            {option}
          </button>
        ))}
      </div>

      <section className="weight-progress-chart-card">
        <div className="weight-progress-chart-stage">
          {!selected ? (
            <div className="weight-progress-summary-row">
              <div>
                <span className="progress-dashboard-kicker">
                  {range === 'PLAN' ? 'Current Plan' : 'Average'}
                </span>
                <strong className="weight-progress-summary-value">
                  {range === 'PLAN'
                    ? (latest ? formatWeight(latest.weight) : '—')
                    : (numeric(series.averageWeight) !== null ? formatWeight(series.averageWeight) : '—')}
                  {range === 'PLAN'
                    ? (latest ? <small> lbs</small> : null)
                    : (numeric(series.averageWeight) !== null ? <small> lbs</small> : null)}
                </strong>
                {range === 'PLAN' && planChange ? (
                  <span className={`progress-weight-change is-${planChange.direction}`}>
                    {planChange.text.replace(' from Start', '')}
                  </span>
                ) : (
                  <span className="weight-progress-summary-period">{summaryPeriod}</span>
                )}
              </div>
              {range === 'PLAN' && start ? (
                <div className="weight-progress-start-stat">
                  <span>Start</span>
                  <strong>{formatWeight(start.weight)} lbs</strong>
                </div>
              ) : null}
            </div>
          ) : null}

          <WeightLineChart
            entries={entries}
            selectedDate={selected?.checkinDate ?? null}
            onSelect={(point) => setSelectedDate(point.checkinDate)}
            onPanRange={canPanRange ? panRange : null}
            photoMarkers={photoMarkers}
            detail
            range={range}
            rangeStart={series.rangeStart}
            rangeEnd={series.rangeEnd}
            granularity={series.granularity}
          />
        </div>

        {photoMarkers?.length && ['D', 'W', 'M', 'PLAN'].includes(range) ? (
          <p className="weight-progress-photo-note">Camera markers show dates with progress photos.</p>
        ) : null}
      </section>

      {selected ? (
        <section className="weight-progress-selected-entry">
          <button
            type="button"
            className="weight-progress-step-button"
            aria-label="Previous weight entry"
            disabled={entries[0]?.checkinDate === selected.checkinDate}
            onClick={() => selectOffset(-1)}
          >
            ‹
          </button>

          <div className="weight-progress-selected-copy">
            <span className="progress-dashboard-kicker">Selected Entry</span>
            <strong>{formatWeight(selected.weight)} lbs</strong>
            <span>{formatSelectedPeriod(selected)}</span>
          </div>

          {selectedMarker?.frontPhotoUrl ? (
            <img
              className="weight-progress-selected-thumbnail"
              src={selectedMarker.frontPhotoUrl}
              alt={`Front progress photo from ${formatLongDate(selectedMarker.checkinDate)}`}
            />
          ) : selectedMarker ? (
            <span className="weight-progress-selected-photo" aria-label="Progress photo available">📷</span>
          ) : null}

          <button
            type="button"
            className="weight-progress-step-button"
            aria-label="Next weight entry"
            disabled={entries.at(-1)?.checkinDate === selected.checkinDate}
            onClick={() => selectOffset(1)}
          >
            ›
          </button>
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
