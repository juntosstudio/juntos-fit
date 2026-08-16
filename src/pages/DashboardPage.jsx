import { useState } from 'react'
import {
  dateKeyToUtcMilliseconds,
  getTodayDateKey,
  isWeeklyCheckInDate,
} from '../utils/dates'
import { formatGoal } from '../utils/formatters'
import { PlanEmptyState } from '../components/plan/PlanEmptyState'

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

function getPlanWeekNumber(plan, today) {
  if (
    !plan?.start_date ||
    !plan?.program_length_weeks ||
    today < plan.start_date
  ) {
    return null
  }

  const daysSinceStart = Math.floor(
    (dateKeyToUtcMilliseconds(today) -
      dateKeyToUtcMilliseconds(plan.start_date)) /
      MILLISECONDS_PER_DAY,
  )

  return Math.min(
    Math.floor(daysSinceStart / 7) + 1,
    Number(plan.program_length_weeks),
  )
}

function formatPercent(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '0%'
  }

  return Number.isFinite(Number(value))
    ? `${Math.round(Number(value))}%`
    : '0%'
}

function formatCount(value, target, suffix = '') {
  const hasValue = Number.isFinite(Number(value))
  const hasTarget = Number.isFinite(Number(target))

  if (!hasValue || !hasTarget) {
    return '—'
  }

  return `${Number(value)} of ${Number(target)}${suffix}`
}

function formatWeight(value) {
  return Number.isFinite(Number(value))
    ? `${Number(value).toFixed(1)} lbs`
    : '—'
}

function hasNumericValue(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return false
  }

  return Number.isFinite(Number(value))
}

function isWeeklyGoalMet(value, target) {
  const numericValue = Number(value)
  const numericTarget = Number(target)

  return (
    Number.isFinite(numericValue) &&
    Number.isFinite(numericTarget) &&
    numericTarget > 0 &&
    numericValue >= numericTarget
  )
}

function getAdherenceState(value) {
  if (!hasNumericValue(value)) {
    return ''
  }

  const percent = Number(value)

  if (percent >= 80) {
    return 'is-adherence-good'
  }

  if (percent >= 60) {
    return 'is-adherence-watch'
  }

  // Keep a low week informative without turning the dashboard
  // into a wall of red feedback.
  return 'is-adherence-neutral'
}

function getPlanProgressRows(
  plan,
  currentWeekNumber,
  completedWeeks,
) {
  const programLength = Number(plan?.program_length_weeks)

  if (!Number.isInteger(programLength) || programLength < 1) {
    return []
  }

  const completedByWeek = new Map(
    (completedWeeks ?? []).map((week) => [
      Number(week.weekNumber),
      week,
    ]),
  )

  return Array.from({ length: programLength }, (_, index) => {
    const weekNumber = index + 1
    const completed = completedByWeek.get(weekNumber)

    if (completed) {
      return {
        ...completed,
        weekNumber,
        status: 'completed',
      }
    }

    if (weekNumber === currentWeekNumber) {
      return {
        weekNumber,
        status: 'current',
      }
    }

    if (
      currentWeekNumber &&
      weekNumber < currentWeekNumber
    ) {
      return {
        weekNumber,
        status: 'needs-review',
      }
    }

    return {
      weekNumber,
      status: 'upcoming',
    }
  })
}

function PlanProgress({
  plan,
  currentWeekNumber,
  completedWeeks,
  onOpenCurrentWeek,
  onOpenWeeklyReview,
}) {
  const [showAllWeeks, setShowAllWeeks] = useState(false)

  const rows = getPlanProgressRows(
    plan,
    currentWeekNumber,
    completedWeeks,
  )

  const defaultLastVisibleWeek = currentWeekNumber
    ? Math.min(
        Number(plan.program_length_weeks),
        currentWeekNumber + 2,
      )
    : Math.min(Number(plan.program_length_weeks), 2)

  const visibleRows = showAllWeeks
    ? rows
    : rows.filter(
        (row) => row.weekNumber <= defaultLastVisibleWeek,
      )

  const hasHiddenWeeks = visibleRows.length < rows.length

  function renderRowContent(row) {
    if (row.status === 'completed') {
      return (
        <>
          <div className="plan-progress-row-topline">
            <strong>Week {row.weekNumber}</strong>
            <span className="plan-progress-status is-complete">
              Completed ✓
            </span>
          </div>

          <div className="plan-progress-row-details">
            {Number.isFinite(Number(row.consistencyPercent)) && (
              <span>
                Consistency{' '}
                <strong>{Math.round(row.consistencyPercent)}%</strong>
              </span>
            )}

            {Number.isFinite(Number(row.averageWeight)) && (
              <span>
                Avg Weight{' '}
                <strong>{formatWeight(row.averageWeight)}</strong>
              </span>
            )}
          </div>
        </>
      )
    }

    if (row.status === 'current') {
      return (
        <>
          <div className="plan-progress-row-topline">
            <strong>Week {row.weekNumber}</strong>
            <span className="plan-progress-status is-current">
              Current
            </span>
          </div>
          <span className="plan-progress-subtext">In progress</span>
        </>
      )
    }

    if (row.status === 'needs-review') {
      return (
        <>
          <div className="plan-progress-row-topline">
            <strong>Week {row.weekNumber}</strong>
            <span className="plan-progress-status is-needs-review">
              Needs Review
            </span>
          </div>
          <span className="plan-progress-subtext">
            Weekly Check-In not finalized
          </span>
        </>
      )
    }

    return (
      <div className="plan-progress-row-topline">
        <strong>Week {row.weekNumber}</strong>
        <span className="plan-progress-status is-upcoming">
          Upcoming
        </span>
      </div>
    )
  }

  return (
    <section
      className="plan-progress-card"
      aria-labelledby="plan-progress-heading"
    >
      <header className="plan-progress-header">
        <h2 id="plan-progress-heading">Plan Progress</h2>
        <p>
          {formatGoal(plan.goal)}
          {currentWeekNumber
            ? ` · Week ${currentWeekNumber} of ${plan.program_length_weeks}`
            : ` · ${plan.program_length_weeks}-Week Plan`}
        </p>
      </header>

      <div className="plan-progress-list">
        {visibleRows.map((row) => {
          if (row.status === 'completed') {
            return (
              <button
                type="button"
                className="plan-progress-row is-clickable is-completed"
                key={row.weekNumber}
                onClick={() => onOpenWeeklyReview(row.weekNumber)}
                aria-label={`Open Week ${row.weekNumber} Weekly Review`}
              >
                <span className="plan-progress-row-content">
                  {renderRowContent(row)}
                </span>
                <span className="plan-progress-chevron" aria-hidden="true">
                  ›
                </span>
              </button>
            )
          }

          if (row.status === 'current') {
            return (
              <button
                type="button"
                className="plan-progress-row is-clickable is-current"
                key={row.weekNumber}
                onClick={onOpenCurrentWeek}
                aria-label={`Open current Week ${row.weekNumber} Daily Check-Ins`}
              >
                <span className="plan-progress-row-content">
                  {renderRowContent(row)}
                </span>
                <span className="plan-progress-chevron" aria-hidden="true">
                  ›
                </span>
              </button>
            )
          }

          return (
            <div
              className={`plan-progress-row is-${row.status}`}
              key={row.weekNumber}
            >
              <span className="plan-progress-row-content">
                {renderRowContent(row)}
              </span>
            </div>
          )
        })}
      </div>

      {(hasHiddenWeeks || showAllWeeks) && rows.length > 0 && (
        <button
          type="button"
          className="text-button plan-progress-toggle"
          onClick={() => setShowAllWeeks((current) => !current)}
          aria-expanded={showAllWeeks}
        >
          {showAllWeeks ? 'Show Less' : '•••  Show All Weeks'}
        </button>
      )}
    </section>
  )
}

// Displays the user's current check-in action, weekly snapshot,
// and progress through the active coaching plan.
export function DashboardPage({
  dashboard,
  loading,
  error,
  signingOut,
  onCreatePlan,
  onOpenStartCheckIn,
  onOpenDailyCheckIn,
  onOpenWeeklyCheckIn,
  onOpenCurrentWeek,
  onOpenWeeklyReview,
  onOpenHistory,
  onOpenPlan,
  onOpenSettings,
  onSignOut,
}) {
  if (loading) {
    return (
      <main className="container dashboard-page">
        <h1 className="dashboard-title">Juntos Coach</h1>
        <p>Loading your plan...</p>
      </main>
    )
  }

  const today = getTodayDateKey()
  const plan = dashboard?.plan ?? null
  const target = dashboard?.target ?? null
  const weekly = dashboard?.weekAtAGlance ?? null
  const settings = dashboard?.settings ?? {
    track_water: true,
    track_alcohol: true,
  }
  const startCheckIn = dashboard?.startCheckIn ?? null
  const currentWeekNumber = getPlanWeekNumber(plan, today)

  const workoutsGoalMet = isWeeklyGoalMet(
    weekly?.workoutsCompleted,
    weekly?.workoutsTarget,
  )

  const cardioGoalMet = isWeeklyGoalMet(
    dashboard?.cardioCompleted,
    target?.weekly_cardio_target_minutes,
  )

  const adherenceState = getAdherenceState(
    weekly?.mealPlanAdherencePercent,
  )

  // Keep the Start Check-In card visible before and on
  // the plan start date. Hide it beginning the next day.
  const showStartCheckIn =
    Boolean(plan?.start_date) && today <= plan.start_date

  const startCheckInAvailable =
    Boolean(plan?.start_date) && today === plan.start_date

  const startCheckInCompleted = startCheckIn?.status === 'completed'

  // Daily check-ins begin the morning after the plan starts,
  // but only after the Start Check-In is complete.
  const canCheckIn =
    Boolean(plan) &&
    today > plan.start_date &&
    startCheckInCompleted

  const weeklyCheckInDue =
    Boolean(plan) &&
    isWeeklyCheckInDate(
      plan.start_date,
      plan.checkin_day,
      today,
    )

  const todayWeeklyCheckIn = dashboard?.todayWeeklyCheckIn ?? null
  const hasCompletedWeeklyCheckIn =
    todayWeeklyCheckIn?.status === 'completed'
  const hasWeeklyDraft = todayWeeklyCheckIn?.status === 'draft'

  const hasCheckedInToday =
    dashboard?.todayCheckIn?.checkin_date === today

  const checkInState = hasCheckedInToday
    ? 'is-complete'
    : 'is-due'
  const checkInLabel = hasCheckedInToday
    ? 'View Today’s Check-In ✓'
    : 'Daily Check-In'

  const weeklyCheckInState = hasCompletedWeeklyCheckIn
    ? 'is-complete'
    : 'is-due'
  const weeklyCheckInLabel = hasCompletedWeeklyCheckIn
    ? 'View This Week’s Check-In ✓'
    : hasWeeklyDraft
      ? 'Resume Weekly Check-In'
      : 'Weekly Check-In'

  const startCheckInState = startCheckInCompleted
    ? 'is-complete'
    : 'is-due'
  const startCheckInLabel = startCheckInCompleted
    ? 'View Your Start Day Check-In ✓'
    : startCheckInAvailable
      ? 'Complete Your Start Day Check-In'
      : 'Your Start Day Check-In'

  const streakDays = Number(dashboard?.streakDays ?? 0)

  return (
    <main className="container dashboard-page">
      <header className="dashboard-header">
        <h1 className="dashboard-title">Juntos Coach</h1>

        {dashboard && (
          <div className="dashboard-welcome-row">
            <p>
              Welcome back, {dashboard.profile.display_name}.
            </p>

            {streakDays > 0 && (
              <p className="dashboard-streak">
                <span aria-hidden="true">🔥</span>{' '}
                {streakDays} Day Streak!!!
              </p>
            )}
          </div>
        )}
      </header>

      {error && <p role="alert">{error}</p>}

      {dashboard && !plan && (
        <PlanEmptyState onCreatePlan={onCreatePlan} />
      )}

      {dashboard && plan && (
        <>
          {canCheckIn && weeklyCheckInDue && (
            <section
              className="dashboard-check-in"
              aria-label="This week’s check-in"
            >
              <button
                type="button"
                className={`daily-check-in-button ${weeklyCheckInState}`}
                onClick={onOpenWeeklyCheckIn}
              >
                {weeklyCheckInLabel}
              </button>
            </section>
          )}

          {canCheckIn && !weeklyCheckInDue && (
            <section
              className="dashboard-check-in"
              aria-label="Today’s daily check-in"
            >
              <button
                type="button"
                className={`daily-check-in-button ${checkInState}`}
                onClick={onOpenDailyCheckIn}
              >
                {checkInLabel}
              </button>
            </section>
          )}

          {showStartCheckIn && (
            <section
              className="dashboard-check-in"
              aria-label="Start Check-In"
            >
              <button
                type="button"
                className={`daily-check-in-button ${startCheckInState}`}
                onClick={onOpenStartCheckIn}
                disabled={!startCheckInAvailable}
              >
                {startCheckInLabel}
              </button>
            </section>
          )}

          {canCheckIn && (
            <section
              className="week-at-a-glance"
              aria-labelledby="week-at-a-glance-heading"
            >
              <h2 id="week-at-a-glance-heading">
                {currentWeekNumber
                  ? `Week ${currentWeekNumber} at a Glance`
                  : 'Week at a Glance'}
              </h2>

              <dl className="weekly-score-list">
                <div>
                  <dt>Meal Plan Adherence</dt>
                  <dd className={adherenceState}>
                    {formatPercent(weekly?.mealPlanAdherencePercent)}
                  </dd>
                </div>

                <div className={workoutsGoalMet ? 'is-goal-met' : undefined}>
                  <dt>
                    {workoutsGoalMet && (
                      <span
                        className="weekly-goal-check"
                        aria-label="Workout goal met"
                        title="Workout goal met"
                      >
                        ✓
                      </span>
                    )}
                    <span>Workouts Complete</span>
                  </dt>
                  <dd>
                    {formatCount(
                      weekly?.workoutsCompleted,
                      weekly?.workoutsTarget,
                      ' workouts',
                    )}
                  </dd>
                </div>

                <div className={cardioGoalMet ? 'is-goal-met' : undefined}>
                  <dt>
                    {cardioGoalMet && (
                      <span
                        className="weekly-goal-check"
                        aria-label="Cardio goal met"
                        title="Cardio goal met"
                      >
                        ✓
                      </span>
                    )}
                    <span>Cardio</span>
                  </dt>
                  <dd>
                    {formatCount(
                      dashboard.cardioCompleted,
                      target?.weekly_cardio_target_minutes,
                      ' mins',
                    )}
                  </dd>
                </div>

                {settings.track_water && (
                  <div>
                    <dt>Daily Water Goal Hit</dt>
                    <dd>
                      {formatCount(
                        weekly?.waterGoalDays,
                        weekly?.daysTracked,
                        ' days',
                      )}
                    </dd>
                  </div>
                )}

                <div>
                  <dt>Weight Weekly Average</dt>
                  <dd>{formatWeight(weekly?.averageWeight)}</dd>
                </div>

                {settings.track_alcohol && (
                  <div>
                    <dt>Alcohol</dt>
                    <dd>
                      {formatCount(
                        weekly?.alcoholDays,
                        weekly?.daysTracked,
                        ' days',
                      )}
                    </dd>
                  </div>
                )}
              </dl>

              <button
                type="button"
                className="dashboard-section-link"
                onClick={onOpenCurrentWeek}
              >
                See Daily Check-Ins →
              </button>
            </section>
          )}

          <PlanProgress
            plan={plan}
            currentWeekNumber={currentWeekNumber}
            completedWeeks={dashboard?.planProgress?.completedWeeks ?? []}
            onOpenCurrentWeek={onOpenCurrentWeek}
            onOpenWeeklyReview={onOpenWeeklyReview}
          />

          {import.meta.env.DEV && (
            <details className="dashboard-dev-tools">
              <summary>DEV Previews</summary>

              <div>
                <button
                  type="button"
                  className="text-button"
                  onClick={onCreatePlan}
                >
                  Preview Create Plan Wizard
                </button>

                <button
                  type="button"
                  className="text-button"
                  onClick={onOpenStartCheckIn}
                >
                  Preview Start Check-In Wizard
                </button>

                <button
                  type="button"
                  className="text-button"
                  onClick={onOpenDailyCheckIn}
                >
                  Preview Daily Check-In Wizard
                </button>

                <button
                  type="button"
                  className="text-button"
                  onClick={onOpenWeeklyCheckIn}
                >
                  Preview Weekly Check-In Wizard
                </button>
              </div>
            </details>
          )}
        </>
      )}

      <button
        type="button"
        className="dashboard-sign-out"
        onClick={onSignOut}
        disabled={signingOut}
      >
        {signingOut ? 'Signing Out...' : 'Sign Out'}
      </button>

      <nav className="bottom-navigation" aria-label="Main navigation">
        <button type="button" className="is-active" aria-current="page">
          Today
        </button>

        <button type="button" onClick={onOpenHistory} disabled={!plan}>
          Progress
        </button>

        <button
          type="button"
          onClick={plan ? onOpenPlan : onCreatePlan}
        >
          Plan
        </button>

        <button type="button" disabled>
          Coach
        </button>

        <button type="button" onClick={onOpenSettings}>
          Settings
        </button>
      </nav>
    </main>
  )
}
