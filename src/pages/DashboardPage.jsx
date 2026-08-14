import {
  dateKeyToUtcMilliseconds,
  getTodayDateKey,
  isWeeklyCheckInDate,
} from '../utils/dates'
import {
  formatDate,
  formatGoal,
} from '../utils/formatters'
import { PlanEmptyState } from '../components/plan/PlanEmptyState'
import { PlanStartStatus } from '../components/plan/PlanStartStatus'
import '../styles/weeklySummary.css'

const MILLISECONDS_PER_DAY =
  24 * 60 * 60 * 1000

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
      dateKeyToUtcMilliseconds(
        plan.start_date,
      )) /
      MILLISECONDS_PER_DAY,
  )

  return Math.min(
    Math.floor(daysSinceStart / 7) + 1,
    Number(
      plan.program_length_weeks,
    ),
  )
}

function getPlanProgressLabel(plan, today) {
  const currentWeek =
    getPlanWeekNumber(
      plan,
      today,
    )

  if (!currentWeek) {
    return ''
  }

  return `Week ${currentWeek} of ${plan.program_length_weeks}`
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

  return 'is-adherence-low'
}

// Displays the user's current plan, check-in action, and weekly snapshot.
export function DashboardPage({
  dashboard,
  loading,
  error,
  signingOut,
  onCreatePlan,
  onOpenStartCheckIn,
  onOpenDailyCheckIn,
  onOpenWeeklyCheckIn,
  onOpenWeeklySummary,
  onOpenHistory,
  onOpenPlan,
  onOpenSettings,
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
  const settings =
    dashboard?.settings ?? {
      track_water: true,
      track_alcohol: true,
    }

  const startCheckIn =
    dashboard?.startCheckIn ?? null

  const currentWeekNumber =
    getPlanWeekNumber(
      plan,
      today,
    )

  const latestCompletedWeeklyCheckIn =
    dashboard
      ?.latestCompletedWeeklyCheckIn ??
    null

  const previousWeekSummaryAvailable =
    Boolean(
      currentWeekNumber &&
      currentWeekNumber > 1 &&
      Number(
        latestCompletedWeeklyCheckIn
          ?.week_number,
      ) ===
        currentWeekNumber - 1,
    )

  const workoutsGoalMet =
    isWeeklyGoalMet(
      weekly?.workoutsCompleted,
      weekly?.workoutsTarget,
    )

  const cardioGoalMet =
    isWeeklyGoalMet(
      dashboard?.cardioCompleted,
      target?.weekly_cardio_target_minutes,
    )

  const adherenceState =
    getAdherenceState(
      weekly?.mealPlanAdherencePercent,
    )

  // Keep the Start Check-In card visible before and on
  // the plan start date. Hide it beginning the next day.
  const showStartCheckIn =
    Boolean(plan?.start_date) &&
    today <= plan.start_date

  // The Start Check-In may only be opened on the
  // plan's actual start date.
  const startCheckInAvailable =
    Boolean(plan?.start_date) &&
    today === plan.start_date

  const startCheckInCompleted =
    startCheckIn?.status === 'completed'

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

  const todayWeeklyCheckIn =
    dashboard?.todayWeeklyCheckIn ?? null

  const hasCompletedWeeklyCheckIn =
    todayWeeklyCheckIn?.status ===
    'completed'

  const hasWeeklyDraft =
    todayWeeklyCheckIn?.status ===
    'draft'

  const hasCheckedInToday =
    dashboard?.todayCheckIn?.checkin_date ===
    today

  const checkInState = hasCheckedInToday
    ? 'is-complete'
    : 'is-due'

  const checkInLabel = hasCheckedInToday
    ? 'View Today’s Check-In ✓'
    : 'Daily Check-In'

  const weeklyCheckInState =
    hasCompletedWeeklyCheckIn
      ? 'is-complete'
      : 'is-due'

  const weeklyCheckInLabel =
    hasCompletedWeeklyCheckIn
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
          {canCheckIn &&
            weeklyCheckInDue && (
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

          {canCheckIn &&
            !weeklyCheckInDue && (
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
              <div className="dashboard-dev-links">
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
            )}
          </section>

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
                  <dd
                    className={adherenceState}
                  >
                    {formatPercent(
                      weekly?.mealPlanAdherencePercent,
                    )}
                  </dd>
                </div>

                <div
                  className={
                    workoutsGoalMet
                      ? 'is-goal-met'
                      : undefined
                  }
                >
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

                <div
                  className={
                    cardioGoalMet
                      ? 'is-goal-met'
                      : undefined
                  }
                >
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
                      target
                        ?.weekly_cardio_target_minutes,
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
                  <dd>
                    {formatWeight(
                      weekly?.averageWeight,
                    )}
                  </dd>
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

              {previousWeekSummaryAvailable ? (
                <button
                  type="button"
                  className="weekly-summary-link"
                  onClick={onOpenWeeklySummary}
                >
                  View Previous Week Summary
                </button>
              ) : (
                <p className="weekly-summary-unavailable">
                  {currentWeekNumber &&
                  currentWeekNumber > 1
                    ? 'Complete the previous week’s Weekly Check-In to unlock its summary.'
                    : 'Complete your first Weekly Check-In to unlock your first Weekly Summary.'}
                </p>
              )}
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
            plan
              ? onOpenPlan
              : onCreatePlan
          }
        >
          Plan
        </button>

        <button type="button" disabled>
          Coach
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
        >
          Settings
        </button>
      </nav>
    </main>
  )
}
