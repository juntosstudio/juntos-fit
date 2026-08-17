import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  loadCurrentWeekCheckIns,
} from '../services/currentWeekService'
import {
  formatDate,
} from '../utils/formatters'
import {
  fromCanonicalMeasurement,
  getMeasurementUnit,
  normalizeUnitSystem,
} from '../utils/measurementUnits'
import '../styles/currentWeek.css'

const MEAL_PLAN_LABELS = {
  1: 'Did not follow',
  2: 'Significantly off',
  3: 'Several deviations',
  4: 'One small deviation',
  5: 'Followed exactly',
}

const WORKOUT_LABELS = {
  completed: 'Completed',
  partial: 'Partial',
  missed: 'Missed',
  rest_day: 'Rest day',
}

const WEIGHT_STATUS_LABELS = {
  traveling: 'Traveling',
  no_scale: 'No scale',
  scale_issue: 'Scale issue',
  skipped: 'Skipped',
}

function dateParts(dateKey) {
  const date = new Date(
    `${dateKey}T00:00:00Z`,
  )

  return {
    shortDay:
      new Intl.DateTimeFormat(
        undefined,
        {
          weekday: 'short',
          timeZone: 'UTC',
        },
      ).format(date),
    longDay:
      new Intl.DateTimeFormat(
        undefined,
        {
          weekday: 'long',
          timeZone: 'UTC',
        },
      ).format(date),
    dayNumber:
      new Intl.DateTimeFormat(
        undefined,
        {
          day: 'numeric',
          timeZone: 'UTC',
        },
      ).format(date),
  }
}

function formatBoolean(value) {
  if (value === true) {
    return 'Yes'
  }

  if (value === false) {
    return 'No'
  }

  return '—'
}

function getStatusLabel(status) {
  return {
    completed: 'Entered ✓',
    'weekly-completed': 'Weekly Complete ✓',
    'weekly-draft': 'Weekly In Progress',
    unavailable: 'No Data',
    missing: 'Missing',
    'missing-weekly': 'Weekly Due',
    today: 'Today',
    'today-weekly': 'Weekly Due Today',
    upcoming: 'Upcoming',
    'start-day': 'Start Day ✓',
  }[status] ?? ''
}

function getNavigatorMark(status) {
  if (
    status === 'completed' ||
    status === 'weekly-completed' ||
    status === 'start-day'
  ) {
    return '✓'
  }

  if (
    status === 'missing' ||
    status === 'missing-weekly'
  ) {
    return '!'
  }

  if (
    status === 'today' ||
    status === 'today-weekly' ||
    status === 'weekly-draft'
  ) {
    return '•'
  }

  if (status === 'unavailable') {
    return '—'
  }

  return ''
}

function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M4 20h4.2L19 9.2a2.1 2.1 0 0 0 0-3L17.8 5a2.1 2.1 0 0 0-3 0L4 15.8V20Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m13.8 6 4.2 4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function Metric({
  label,
  value,
  detail,
  wide = false,
}) {
  return (
    <div
      className={`current-week-metric${
        wide ? ' is-wide' : ''
      }`}
    >
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  )
}

function getWeightDisplay(
  row,
  unitSystem,
) {
  if (!row) {
    return {
      value: '—',
      detail: '',
    }
  }

  if (
    row.weight_status &&
    row.weight_status !== 'recorded'
  ) {
    return {
      value:
        WEIGHT_STATUS_LABELS[
          row.weight_status
        ] ?? 'Not recorded',
      detail: '',
    }
  }

  const displayed =
    fromCanonicalMeasurement(
      'starting_weight_lbs',
      row.morning_weight,
      unitSystem,
    )

  if (
    displayed === null ||
    displayed === undefined ||
    displayed === ''
  ) {
    return {
      value: '—',
      detail: '',
    }
  }

  return {
    value: `${displayed} ${getMeasurementUnit(
      'starting_weight_lbs',
      unitSystem,
    )}`,
    detail: '',
  }
}

function DailyMetrics({
  row,
  settings,
  unitSystem,
}) {
  const weight =
    getWeightDisplay(
      row,
      unitSystem,
    )

  const mealScore =
    Number(row?.meal_plan_score)

  const metrics = [
    {
      key: 'weight',
      label: 'Weight',
      value: weight.value,
      detail: weight.detail,
    },
    {
      key: 'meal',
      label: 'Meal Plan',
      value:
        Number.isFinite(mealScore)
          ? `${mealScore}/5`
          : '—',
      detail:
        MEAL_PLAN_LABELS[
          mealScore
        ] ?? '',
    },
    {
      key: 'hunger',
      label: 'Hunger',
      value:
        Number.isFinite(
          Number(row?.hunger_score),
        )
          ? `${Number(
              row.hunger_score,
            )}/5`
          : '—',
    },
    {
      key: 'workout',
      label: 'Workout',
      value:
        WORKOUT_LABELS[
          row?.workout_status
        ] ?? '—',
    },
    {
      key: 'cardio',
      label: 'Cardio',
      value:
        row?.cardio_minutes !==
          null &&
        row?.cardio_minutes !==
          undefined
          ? `${Number(
              row.cardio_minutes,
            ) || 0} min`
          : '—',
    },
  ]

  if (settings?.track_water) {
    metrics.push({
      key: 'water',
      label: 'Water Goal',
      value: formatBoolean(
        row?.water_goal_met,
      ),
    })
  }

  if (settings?.track_alcohol) {
    metrics.push({
      key: 'alcohol',
      label: 'Alcohol',
      value: formatBoolean(
        row?.alcohol_consumed,
      ),
    })
  }

  if (row?.planned_cheat_meal_status) {
    metrics.push({
      key: 'cheat-meal',
      label: 'Planned Cheat Meal',
      value:
        row.planned_cheat_meal_status ===
        'eaten'
          ? 'Yes'
          : 'No',
    })
  }

  if (row?.meal_plan_deviation_details) {
    metrics.push({
      key: 'meal-details',
      label: 'Meal Details',
      value:
        row.meal_plan_deviation_details,
      wide: true,
    })
  }

  if (row?.workout_incomplete_reason) {
    metrics.push({
      key: 'workout-reason',
      label: 'Workout Reason',
      value:
        row.workout_incomplete_reason,
      wide: true,
    })
  }

  if (
    row?.training_problem !==
      null &&
    row?.training_problem !==
      undefined
  ) {
    metrics.push({
      key: 'training-problem',
      label: 'Training Problem',
      value:
        formatBoolean(
          row.training_problem,
        ),
    })
  }

  if (row?.training_problem_details) {
    metrics.push({
      key: 'training-details',
      label: 'Training Details',
      value:
        row.training_problem_details,
      wide: true,
    })
  }

  if (row?.alcohol_details) {
    metrics.push({
      key: 'alcohol-details',
      label: 'Alcohol Details',
      value:
        row.alcohol_details,
      wide: true,
    })
  }

  if (row?.additional_notes) {
    metrics.push({
      key: 'notes',
      label: 'Notes',
      value: row.additional_notes,
      wide: true,
    })
  }

  if (row?.questions_for_coach) {
    metrics.push({
      key: 'coach',
      label: 'Questions for Coach',
      value:
        row.questions_for_coach,
      wide: true,
    })
  }

  return (
    <div
      className="current-week-metrics"
      role="group"
      aria-label="Daily Check-In answers"
    >
      {metrics.map((metric) => (
        <Metric
          key={metric.key}
          label={metric.label}
          value={metric.value}
          detail={metric.detail}
          wide={metric.wide}
        />
      ))}
    </div>
  )
}

function DayAction({
  day,
  onCompleteDay,
  onOpenDailyCheckIn,
  onOpenWeeklyCheckIn,
  onEditDay,
}) {
  if (day.status === 'missing') {
    return (
      <button
        type="button"
        className="current-week-row-action"
        onClick={() =>
          onCompleteDay(day.date)
        }
      >
        Enter Missing Check-In
      </button>
    )
  }

  if (
    day.status ===
      'today-weekly' ||
    day.status === 'weekly-draft'
  ) {
    return (
      <button
        type="button"
        className="current-week-row-action"
        onClick={
          onOpenWeeklyCheckIn
        }
      >
        {day.status ===
        'weekly-draft'
          ? 'Resume Weekly Check-In'
          : 'Complete Weekly Check-In'}
      </button>
    )
  }

  if (day.status === 'today') {
    return (
      <button
        type="button"
        className="current-week-row-action"
        onClick={
          onOpenDailyCheckIn
        }
      >
        Complete Today’s Check-In
      </button>
    )
  }

  if (
    day.status ===
    'missing-weekly'
  ) {
    return (
      <p className="current-week-row-note">
        This Weekly Check-In still needs to be completed.
      </p>
    )
  }

  if (day.status === 'unavailable') {
    return (
      <p className="current-week-row-note">
        You marked this day as unavailable.
      </p>
    )
  }

  if (day.status === 'upcoming') {
    return (
      <p className="current-week-row-note">
        This day hasn’t arrived yet.
      </p>
    )
  }

  if (day.status === 'start-day') {
    return (
      <p className="current-week-row-note">
        Your plan started here. Start Day Check-In complete.
      </p>
    )
  }

  return null
}

function DayRow({
  day,
  active,
  rowRef,
  settings,
  unitSystem,
  onCompleteDay,
  onOpenDailyCheckIn,
  onOpenWeeklyCheckIn,
  onEditDay,
}) {
  const {
    longDay,
  } = dateParts(day.date)

  const hasDailyAnswers =
    Boolean(day.dailyRow)

  // A completed Daily remains editable only while its
  // reporting week is still open. The Weekly day itself
  // becomes weekly-completed after finalization and is
  // intentionally not editable.
  const editable =
    hasDailyAnswers &&
    day.status === 'completed'

  return (
    <section
      ref={rowRef}
      className={`current-week-day-row is-${day.status}${
        active
          ? ' is-active'
          : ''
      }`}
      data-date={day.date}
    >
      <header className="current-week-row-header">
        <div>
          <span className="current-week-row-day">
            {longDay}
          </span>
          <h2>
            {formatDate(day.date)}
          </h2>
        </div>

        <div className="current-week-row-tools">
          <span
            className={`current-week-status is-${day.status}`}
          >
            {getStatusLabel(
              day.status,
            )}
          </span>

          {editable && (
            <button
              type="button"
              className="current-week-edit"
              aria-label={`Edit ${longDay} Daily Check-In`}
              title="Edit Daily Check-In"
              onClick={() =>
                onEditDay?.(day.date)
              }
            >
              <PencilIcon />
            </button>
          )}
        </div>
      </header>

      {hasDailyAnswers ? (
        <>
          <div className="current-week-swipe-hint">
            Swipe to see all answers →
          </div>

          <div className="current-week-metrics-scroll">
            <DailyMetrics
              row={day.dailyRow}
              settings={settings}
              unitSystem={unitSystem}
            />
          </div>
        </>
      ) : (
        <div className="current-week-empty-row">
          <DayAction
            day={day}
            onCompleteDay={onCompleteDay}
            onOpenDailyCheckIn={
              onOpenDailyCheckIn
            }
            onOpenWeeklyCheckIn={
              onOpenWeeklyCheckIn
            }
          />
        </div>
      )}
    </section>
  )
}

export function CurrentWeekPage({
  plan,
  profile,
  settings,
  onCompleteDay,
  onOpenDailyCheckIn,
  onOpenWeeklyCheckIn,
  onEditDay,
  onOpenToday,
  onOpenHistory,
  onOpenPlan,
  onOpenSettings,
}) {
  const [week, setWeek] =
    useState(null)
  const [loading, setLoading] =
    useState(true)
  const [error, setError] =
    useState('')
  const [activeDate, setActiveDate] =
    useState(null)

  const navRef = useRef(null)
  const rowRefs = useRef(
    new Map(),
  )

  const unitSystem =
    normalizeUnitSystem(
      profile?.unit_system,
    )

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!plan?.id) {
        setWeek(null)
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        const next =
          await loadCurrentWeekCheckIns(
            plan,
          )

        if (cancelled) {
          return
        }

        setWeek(next)

        const initial =
          next?.days?.find(
            (day) =>
              day.date === next.today,
          )?.date ??
          next?.days?.[0]?.date ??
          null

        setActiveDate(initial)
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError?.message ||
              'This week’s Daily Check-Ins could not be loaded.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [plan])

  const days =
    useMemo(
      () => week?.days ?? [],
      [week?.days],
    )

  useEffect(() => {
    if (!days.length) {
      return undefined
    }

    let frame = null

    function updateActiveFromScroll() {
      frame = null

      const anchor =
        (
          navRef.current
            ?.getBoundingClientRect()
            .bottom ?? 0
        ) + 14

      let bestDate =
        days[0].date
      let bestDistance =
        Number.POSITIVE_INFINITY

      for (const day of days) {
        const element =
          rowRefs.current.get(
            day.date,
          )

        if (!element) {
          continue
        }

        const rect =
          element.getBoundingClientRect()

        if (rect.bottom < anchor) {
          continue
        }

        const distance =
          Math.abs(
            rect.top - anchor,
          )

        if (
          distance <
          bestDistance
        ) {
          bestDistance = distance
          bestDate = day.date
        }
      }

      setActiveDate(
        (current) =>
          current === bestDate
            ? current
            : bestDate,
      )
    }

    function handleScroll() {
      if (frame !== null) {
        return
      }

      frame =
        window.requestAnimationFrame(
          updateActiveFromScroll,
        )
    }

    updateActiveFromScroll()

    window.addEventListener(
      'scroll',
      handleScroll,
      {
        passive: true,
      },
    )

    return () => {
      window.removeEventListener(
        'scroll',
        handleScroll,
      )

      if (frame !== null) {
        window.cancelAnimationFrame(
          frame,
        )
      }
    }
  }, [days])

  function jumpToDate(date) {
    setActiveDate(date)

    rowRefs.current
      .get(date)
      ?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
  }

  if (loading) {
    return (
      <main className="container current-week-page">
        <button
          type="button"
          className="text-button"
          onClick={onOpenToday}
        >
          ← Back to Today
        </button>

        <h1>Daily Check-Ins</h1>
        <p>Loading this week...</p>
      </main>
    )
  }

  if (!plan) {
    return (
      <main className="container current-week-page">
        <button
          type="button"
          className="text-button"
          onClick={onOpenToday}
        >
          ← Back to Today
        </button>

        <h1>Daily Check-Ins</h1>
        <p role="alert">
          An active coaching plan is required.
        </p>
      </main>
    )
  }

  return (
    <>
      <main className="container current-week-page">
        <button
          type="button"
          className="text-button"
          onClick={onOpenToday}
        >
          ← Back to Today
        </button>

        <header className="current-week-header">
          <h1>
            Week {week?.weekNumber ?? ''} Daily Check-Ins
          </h1>

          {week && (
            <p>
              {formatDate(
                week.weekStart,
              )}
              {' – '}
              {formatDate(
                week.weekEnd,
              )}
            </p>
          )}

          <small>
            Tap a day to jump to it. Swipe each row to see the answers recorded that day.
          </small>
        </header>

        {error && (
          <p role="alert">{error}</p>
        )}

        {week && (
          <nav
            ref={navRef}
            className="current-week-day-nav"
            aria-label="Days in this program week"
          >
            {days.map((day) => {
              const parts =
                dateParts(day.date)

              return (
                <button
                  type="button"
                  key={day.date}
                  className={`current-week-day-button is-${day.status}${
                    activeDate ===
                    day.date
                      ? ' is-active'
                      : ''
                  }`}
                  aria-current={
                    activeDate ===
                    day.date
                      ? 'true'
                      : undefined
                  }
                  onClick={() =>
                    jumpToDate(
                      day.date,
                    )
                  }
                >
                  <span>
                    {
                      parts.shortDay
                    }
                  </span>
                  <strong>
                    {
                      parts.dayNumber
                    }
                  </strong>
                  <small
                    aria-hidden="true"
                  >
                    {getNavigatorMark(
                      day.status,
                    )}
                  </small>
                </button>
              )
            })}
          </nav>
        )}

        <div className="current-week-rows">
          {days.map((day) => (
            <DayRow
              key={day.date}
              day={day}
              active={
                activeDate ===
                day.date
              }
              rowRef={(element) => {
                if (element) {
                  rowRefs.current.set(
                    day.date,
                    element,
                  )
                } else {
                  rowRefs.current.delete(
                    day.date,
                  )
                }
              }}
              settings={settings}
              unitSystem={unitSystem}
              onCompleteDay={
                onCompleteDay
              }
              onOpenDailyCheckIn={
                onOpenDailyCheckIn
              }
              onOpenWeeklyCheckIn={
                onOpenWeeklyCheckIn
              }
              onEditDay={onEditDay}
            />
          ))}
        </div>
      </main>

      <nav
        className="bottom-navigation"
        aria-label="Main navigation"
      >
        <button
          type="button"
          className="is-active"
          aria-current="page"
          onClick={onOpenToday}
        >
          Today
        </button>

        <button
          type="button"
          onClick={onOpenHistory}
        >
          Progress
        </button>

        <button
          type="button"
          onClick={onOpenPlan}
        >
          Plan
        </button>

        <button
          type="button"
          disabled
        >
          Coach
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
        >
          Settings
        </button>
      </nav>
    </>
  )
}
