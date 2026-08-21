import {
  getTodayDateKey,
  isWeeklyCheckInDate,
} from '../utils/dates'
import { PlanEmptyState } from '../components/plan/PlanEmptyState'
import {
  PlanProgress,
} from '../components/progress/PlanProgress'
import {
  getPlanWeekNumber,
} from '../utils/planProgress'
import {
  formatDate,
} from '../utils/formatters'

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

function getAdherenceState(
  value,
  coveragePercent,
) {
  if (!hasNumericValue(value)) {
    return ''
  }

  const percent = Number(value)
  const coverage = Number(coveragePercent)

  if (
    percent >= 85 &&
    Number.isFinite(coverage) &&
    coverage >= 80
  ) {
    return 'is-adherence-good'
  }

  if (percent >= 80) {
    return 'is-adherence-watch'
  }

  // Keep a low week informative without turning the dashboard
  // into a wall of red feedback.
  return 'is-adherence-neutral'
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

  // Reporting stays on the week being closed through Weekly morning.
  // Plan Progress may advance as soon as that Weekly is finalized.
  const reportingWeekNumber =
    dashboard?.reportingWeekNumber ??
    getPlanWeekNumber(
      plan,
      today,
    )

  const planProgressCurrentWeekNumber =
    dashboard?.planProgress?.currentWeekNumber ??
    reportingWeekNumber

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
    weekly?.mealPlanCoveragePercent,
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
  const overdueWeeklyCheckIn =
    dashboard?.overdueWeeklyCheckIn ?? null
  const hasCompletedWeeklyCheckIn =
    todayWeeklyCheckIn?.status === 'completed'
  const hasWeeklyDraft = todayWeeklyCheckIn?.status === 'draft'

  const closedReportingWeekToday =
    weeklyCheckInDue &&
    hasCompletedWeeklyCheckIn &&
    Number(
      todayWeeklyCheckIn?.week_number,
    ) ===
      Number(
        reportingWeekNumber,
      )

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
    ? `View Week ${reportingWeekNumber} Review ✓`
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
          {canCheckIn && overdueWeeklyCheckIn && (
            <section
              className="dashboard-overdue-weekly"
              aria-label={`Week ${overdueWeeklyCheckIn.weekNumber} Weekly Check-In overdue`}
            >
              <div>
                <strong>
                  Week {overdueWeeklyCheckIn.weekNumber} Weekly Check-In is overdue
                </strong>

                <p>
                  Complete it by {formatDate(overdueWeeklyCheckIn.graceEndDate)}
                  {' '}to close last week. Week {planProgressCurrentWeekNumber}
                  {' '}stays current.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  onOpenWeeklyCheckIn(
                    overdueWeeklyCheckIn.checkinDate,
                  )
                }
              >
                Complete Weekly Check-In
              </button>
            </section>
          )}

          {canCheckIn && weeklyCheckInDue && (
            <section
              className="dashboard-check-in"
              aria-label="This week’s check-in"
            >
              <button
                type="button"
                className={`daily-check-in-button ${weeklyCheckInState}`}
                onClick={
                  hasCompletedWeeklyCheckIn
                    ? () =>
                        onOpenWeeklyReview(
                          reportingWeekNumber,
                        )
                    : () =>
                        onOpenWeeklyCheckIn(today)
                }
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
                {reportingWeekNumber
                  ? closedReportingWeekToday
                    ? `Week ${reportingWeekNumber} Final Results`
                    : `Week ${reportingWeekNumber} at a Glance`
                  : 'Week at a Glance'}
              </h2>

              <dl className="weekly-score-list">
                <div
                  className={
                    adherenceState === 'is-adherence-good'
                      ? 'is-goal-met'
                      : undefined
                  }
                >
                  <dt>
                    {adherenceState === 'is-adherence-good' && (
                      <span
                        className="weekly-goal-check"
                        aria-label="Meal plan adherence goal met"
                        title="Meal plan adherence goal met"
                      >
                        ✓
                      </span>
                    )}
                    <span>Meal Plan Adherence</span>
                  </dt>
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
                onClick={
                  closedReportingWeekToday
                    ? () =>
                        onOpenWeeklyReview(
                          reportingWeekNumber,
                        )
                    : onOpenCurrentWeek
                }
              >
                {closedReportingWeekToday
                  ? 'See Weekly Review →'
                  : 'See Daily Check-Ins →'}
              </button>
            </section>
          )}

          <PlanProgress
            plan={plan}
            currentWeekNumber={
              planProgressCurrentWeekNumber
            }
            weeks={dashboard?.planProgress?.weeks ?? []}
            onOpenCurrentWeek={
              planProgressCurrentWeekNumber ===
              reportingWeekNumber
                ? onOpenCurrentWeek
                : null
            }
            onOpenWeeklyReview={onOpenWeeklyReview}
            onOpenWeeklyCheckIn={onOpenWeeklyCheckIn}
            onShowAllWeeks={onOpenHistory}
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
                  onClick={() =>
                    onOpenWeeklyCheckIn(today)
                  }
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
