import {
  addDays,
  dateKeyToUtcMilliseconds,
  getTodayDateKey,
} from '../utils/dates'
import {
  formatDate,
  formatGoal,
} from '../utils/formatters'
import {
  WEEKDAY_OPTIONS,
} from '../utils/createPlanFlow'

const MILLISECONDS_PER_DAY =
  24 * 60 * 60 * 1000

function getPlanEndDate(plan) {
  if (plan?.end_date) {
    return plan.end_date
  }

  const programLengthWeeks = Number(
    plan?.program_length_weeks,
  )

  if (
    !plan?.start_date ||
    !Number.isInteger(programLengthWeeks) ||
    programLengthWeeks < 1
  ) {
    return null
  }

  return addDays(
    plan.start_date,
    programLengthWeeks * 7,
  )
}

function getCurrentWeek(plan, today) {
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
    Number(plan.program_length_weeks),
  )
}

function getWeekdayLabel(value) {
  return (
    WEEKDAY_OPTIONS.find(
      (option) =>
        Number(option.value) ===
        Number(value),
    )?.label ?? 'Not set'
  )
}

function getBodyFatLabel(source) {
  if (source === 'scale') {
    return 'Scale'
  }

  if (source === 'juntos_estimate') {
    return 'Juntos Estimate (RFM)'
  }

  return 'Off'
}

function getUnitLabel(value) {
  return value === 'metric'
    ? 'Metric'
    : 'Imperial'
}

function getSideLabel(value) {
  if (value === 'left') {
    return 'Left'
  }

  if (value === 'right') {
    return 'Right'
  }

  return 'Not set'
}

function formatNumber(value) {
  return Number.isFinite(Number(value))
    ? Number(value).toLocaleString()
    : '—'
}

function PlanDetailRow({
  label,
  value,
}) {
  return (
    <div className="plan-detail-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

export function PlanPage({
  dashboard,
  onOpenToday,
  onOpenHistory,
  onOpenSettings,
  onCreatePlan,
}) {
  const today = getTodayDateKey()
  const profile = dashboard?.profile ?? null
  const plan = dashboard?.plan ?? null
  const target = dashboard?.target ?? null
  const settings =
    dashboard?.settings ?? null

  if (!plan) {
    return (
      <main className="container plan-page">
        <h1>Plan</h1>

        <p>
          You do not have an active coaching plan yet.
        </p>

        <button
          type="button"
          onClick={onCreatePlan}
        >
          Create Your Plan
        </button>

        <nav
          className="bottom-navigation"
          aria-label="Main navigation"
        >
          <button
            type="button"
            onClick={onOpenToday}
          >
            Today
          </button>

          <button
            type="button"
            disabled
          >
            Progress
          </button>

          <button
            type="button"
            className="is-active"
            aria-current="page"
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

  const currentWeek =
    getCurrentWeek(plan, today)

  const planEndDate =
    getPlanEndDate(plan)

  const bodyFatSource =
    settings?.body_fat_source ??
    plan.body_fat_source ??
    'none'

  const photoFrequency =
    Number(
      plan.photo_frequency_weeks,
    ) || 4

  const displayName =
    profile?.display_name?.trim() ||
    ''

  const planTitle = displayName
    ? `${displayName}’s Current Plan`
    : 'Your Current Plan'

  return (
    <main className="container plan-page">
      <details className="plan-selector">
        <summary>{planTitle}</summary>

        <div className="plan-selector-menu">
          <div className="plan-selector-option is-current">
            <span>
              Current · {formatGoal(plan.goal)}
            </span>

            <small>
              {formatDate(plan.start_date)}
              {' – '}
              {formatDate(planEndDate)}
            </small>
          </div>
        </div>
      </details>

      <section
        className="plan-overview"
        aria-label="Current plan overview"
      >
        <p className="plan-overview-goal">
          {formatGoal(plan.goal)}
        </p>

        <p className="plan-overview-week">
          {currentWeek
            ? `Week ${currentWeek} of ${plan.program_length_weeks}`
            : `${plan.program_length_weeks}-Week Plan`}
        </p>

        <div className="plan-overview-meta">
          <span>
            {formatDate(plan.start_date)}
            {' → '}
            {formatDate(planEndDate)}
          </span>

          <span>
            Check-In:{' '}
            {getWeekdayLabel(
              plan.checkin_day,
            )}
          </span>
        </div>
      </section>

      <div className="plan-card-grid plan-card-grid-primary">
        <section className="plan-card plan-card-nutrition">
          <h2>Daily Nutrition</h2>

          <div className="plan-primary-stat">
            <strong>
              {formatNumber(
                target?.calorie_target,
              )}
            </strong>
            <span>Calories</span>
          </div>

          <div className="plan-macro-row">
            <div>
              <strong>
                {formatNumber(
                  target?.protein_grams,
                )}g
              </strong>
              <span>Protein</span>
            </div>

            <div>
              <strong>
                {formatNumber(
                  target?.carb_grams,
                )}g
              </strong>
              <span>Carbs</span>
            </div>

            <div>
              <strong>
                {formatNumber(
                  target?.fat_grams,
                )}g
              </strong>
              <span>Fat</span>
            </div>
          </div>

          {settings?.track_water !== false &&
          Number.isFinite(
            Number(
              target?.daily_water_goal_oz,
            ),
          ) && (
            <p className="plan-card-footnote">
              Water ·{' '}
              <strong>
                {formatNumber(
                  target.daily_water_goal_oz,
                )} oz/day
              </strong>
            </p>
          )}
        </section>

        <section className="plan-card plan-card-activity">
          <h2>Weekly Activity</h2>

          <div className="plan-activity-stats">
            <div className="plan-primary-stat">
              <strong>
                {formatNumber(
                  target?.weekly_workout_target,
                )}
              </strong>
              <span>
                Workouts / week
              </span>
            </div>

            <div className="plan-primary-stat">
              <strong>
                {formatNumber(
                  target
                    ?.weekly_cardio_target_minutes,
                )}
              </strong>
              <span>
                Cardio min / week
              </span>
            </div>
          </div>
        </section>
      </div>

      <div className="plan-card-grid plan-card-grid-secondary">
        <section className="plan-card plan-card-schedule">
          <h2>Check-In Schedule</h2>

          <dl>
            <PlanDetailRow
              label="Weekly Check-In"
              value={getWeekdayLabel(
                plan.checkin_day,
              )}
            />

            <PlanDetailRow
              label="Waist"
              value="Weekly"
            />

            <PlanDetailRow
              label="Full Measurements"
              value={`Every ${photoFrequency} Weeks + Final`}
            />

            <PlanDetailRow
              label="Photos"
              value={`Every ${photoFrequency} Weeks + Final`}
            />

            <PlanDetailRow
              label="Measurement Side"
              value={getSideLabel(
                plan.measurement_side,
              )}
            />
          </dl>
        </section>

        <section className="plan-card plan-card-tracking">
          <h2>Tracking</h2>

          <dl>
            <PlanDetailRow
              label="Body Fat"
              value={getBodyFatLabel(
                bodyFatSource,
              )}
            />

            <PlanDetailRow
              label="Water"
              value={
                settings?.track_water ===
                false
                  ? 'Off'
                  : 'On'
              }
            />

            <PlanDetailRow
              label="Alcohol"
              value={
                settings
                  ?.track_alcohol ===
                false
                  ? 'Off'
                  : 'On'
              }
            />

            <PlanDetailRow
              label="Units"
              value={getUnitLabel(
                profile?.unit_system,
              )}
            />
          </dl>
        </section>
      </div>

      <button
        type="button"
        className="plan-settings-button"
        onClick={onOpenSettings}
      >
        Check-In Settings
      </button>

      <p className="plan-read-only-note">
        Your active coaching targets are read-only for now.
      </p>

      <nav
        className="bottom-navigation"
        aria-label="Main navigation"
      >
        <button
          type="button"
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
          className="is-active"
          aria-current="page"
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
