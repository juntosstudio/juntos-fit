import {
  dateKeyToUtcMilliseconds,
  getTodayDateKey,
} from '../utils/dates'
import {
  formatDate,
  formatGoal,
} from '../utils/formatters'
import { PlanEmptyState } from '../components/plan/PlanEmptyState'
import { PlanStartStatus } from '../components/plan/PlanStartStatus'

const MILLISECONDS_PER_DAY =
  24 * 60 * 60 * 1000

function getPlanProgressLabel(plan, today) {
  if (
    !plan?.start_date ||
    !plan?.program_length_weeks ||
    today < plan.start_date
  ) {
    return ''
  }

  const daysSinceStart = Math.floor(
    (dateKeyToUtcMilliseconds(today) -
      dateKeyToUtcMilliseconds(
        plan.start_date,
      )) /
      MILLISECONDS_PER_DAY,
  )

  const currentWeek = Math.min(
    Math.floor(daysSinceStart / 7) + 1,
    plan.program_length_weeks,
  )

  return `Week ${currentWeek} of ${plan.program_length_weeks}`
}

function formatPercent(value) {
  return Number.isFinite(Number(value))
    ? `${Math.round(Number(value))}%`
    : '—'
}

function formatCount(
  value,
  target,
  suffix = '',
) {
  const hasValue =
    Number.isFinite(Number(value))
  const hasTarget =
    Number.isFinite(Number(target))

  if (!hasValue || !hasTarget) {
    return '—'
  }

  return `${Number(value)} of ${Number(
    target,
  )}${suffix}`
}

function formatWeight(value) {
  return Number.isFinite(Number(value))
    ? `${Number(value).toFixed(1)} lbs`
    : '—'
}

// Displays the user's current plan, check-in action, and weekly snapshot.
export function DashboardPage({
  dashboard,
  loading,
  error,
  signingOut,
  onCreatePlan,
  onOpenDailyCheckIn,
  onOpenHistory,
  onSignOut,
}) {
  if (loading) {
    return (
      <main className="container dashboard-page">
        <h1 className="dashboard-title">
          Juntos Coach
        </h1>

        <p>Loading your plan...</p>
      </main>
    )
  }

  const today = getTodayDateKey()
  const plan = dashboard?.plan ?? null
  const target = dashboard?.target ?? null
  const weekly =
    dashboard?.weekAtAGlance ?? null

  // Daily check-ins begin the morning after the plan start date.
  // Start Check-In completion will become an additional gate once built.
  const canCheckIn =
    Boolean(plan) && today > plan.start_date

  const hasCheckedInToday =
    dashboard?.todayCheckIn?.checkin_date ===
    today

  const checkInState = hasCheckedInToday
    ? 'is-complete'
    : 'is-due'

  const checkInLabel = hasCheckedInToday
    ? 'View Today’s Check-In ✓'
    : 'Daily Check-In'

  const streakDays = Number(
    dashboard?.streakDays ?? 0,
  )

  return (
    <main className="container dashboard-page">
      <header className="dashboard-header">
        <h1 className="dashboard-title">
          Juntos Coach
        </h1>

        {dashboard && (
          <div className="dashboard-welcome-row">
            <p>
              Welcome back,{' '}
              {dashboard.profile.display_name}.
            </p>

            {streakDays > 0 && (
              <p className="dashboard-streak">
                {streakDays} Day Streak!!!
              </p>
            )}
          </div>
        )}
      </header>

      {error && <p role="alert">{error}</p>}

      {dashboard && !plan && (
        <PlanEmptyState
          onCreatePlan={onCreatePlan}
        />
      )}

      {dashboard && plan && (
        <>
          {canCheckIn && (
            <section
              className="dashboard-check-in"
              aria-label="Today’s check-in"
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

          <section
            className="dashboard-plan-summary"
            aria-labelledby="current-plan-heading"
          >
            <h2
              id="current-plan-heading"
              className="visually-hidden"
            >
              Current Plan
            </h2>

            <p>
              <strong>Current Plan:</strong>{' '}
              {formatGoal(plan.goal)}
            </p>

            <p>
              <strong>Plan Start Date:</strong>{' '}
              {formatDate(plan.start_date)}
            </p>

            <PlanStartStatus
              startDate={plan.start_date}
              today={today}
            />

            {today >= plan.start_date && (
              <p className="dashboard-plan-progress">
                {getPlanProgressLabel(
                  plan,
                  today,
                )}
              </p>
            )}

            {import.meta.env.DEV && (
              <button
                type="button"
                className="text-button"
                onClick={onCreatePlan}
              >
                Preview Create Plan Wizard
              </button>
            )}
          </section>

          {today > plan.start_date && (
            <section
              className="week-at-a-glance"
              aria-labelledby="week-at-a-glance-heading"
            >
              <h2 id="week-at-a-glance-heading">
                Week at a Glance
              </h2>

              <dl className="weekly-score-list">
                <div>
                  <dt>Meal Plan Adherence</dt>
                  <dd>
                    {formatPercent(
                      weekly?.mealPlanAdherencePercent,
                    )}
                  </dd>
                </div>

                <div>
                  <dt>Workouts Complete</dt>
                  <dd>
                    {formatCount(
                      weekly?.workoutsCompleted,
                      weekly?.workoutsTarget,
                      ' workouts',
                    )}
                  </dd>
                </div>

                <div>
                  <dt>Cardio</dt>
                  <dd>
                    {formatCount(
                      dashboard.cardioCompleted,
                      target
                        ?.weekly_cardio_target_minutes,
                      ' mins',
                    )}
                  </dd>
                </div>

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

                <div>
                  <dt>Weight Weekly Average</dt>
                  <dd>
                    {formatWeight(
                      weekly?.averageWeight,
                    )}
                  </dd>
                </div>

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
              </dl>

              <button
                type="button"
                className="weekly-summary-link"
                onClick={onOpenHistory}
              >
                View Weekly Summary
              </button>
            </section>
          )}
        </>
      )}

      <button
        type="button"
        className="dashboard-sign-out"
        onClick={onSignOut}
        disabled={signingOut}
      >
        {signingOut
          ? 'Signing Out...'
          : 'Sign Out'}
      </button>

      <nav
        className="bottom-navigation"
        aria-label="Main navigation"
      >
        <button
          type="button"
          className="is-active"
          aria-current="page"
        >
          Today
        </button>

        <button
          type="button"
          onClick={onOpenHistory}
          disabled={!plan}
        >
          Progress
        </button>

        <button
          type="button"
          onClick={
            plan ? undefined : onCreatePlan
          }
          disabled={Boolean(plan)}
        >
          Plan
        </button>

        <button type="button" disabled>
          Coach
        </button>

        <button type="button" disabled>
          More
        </button>
      </nav>
    </main>
  )
}
