import {
  PlanProgressOverview,
} from '../components/progress/PlanProgressOverview'
import {
  getTodayDateKey,
} from '../utils/dates'
import {
  getPlanWeekNumber,
} from '../utils/planProgress'

export function ProgressPage({
  dashboard,
  onOpenToday,
  onOpenCurrentWeek,
  onOpenWeeklyReview,
  onOpenWeeklyCheckIn,
  onOpenPlan,
  onOpenSettings,
}) {
  const plan =
    dashboard?.plan ?? null

  const reportingWeekNumber =
    getPlanWeekNumber(
      plan,
      getTodayDateKey(),
    )

  const currentWeekNumber =
    dashboard?.planProgress?.currentWeekNumber ??
    reportingWeekNumber

  return (
    <>
      <main className="container plan-progress-page">
        <button
          type="button"
          className="text-button"
          onClick={onOpenToday}
        >
          ← Back to Today
        </button>

        {!plan ? (
          <section className="plan-progress-empty">
            <h1>Plan Progress</h1>

            <p>
              Create a coaching plan to
              start tracking your progress.
            </p>
          </section>
        ) : (
          <PlanProgressOverview
            plan={plan}
            currentWeekNumber={currentWeekNumber}
            weeks={dashboard?.planProgress?.weeks ?? []}
            measurements={dashboard?.planProgress?.measurements ?? []}
            onOpenCurrentWeek={
              currentWeekNumber === reportingWeekNumber
                ? onOpenCurrentWeek
                : null
            }
            onOpenWeeklyReview={onOpenWeeklyReview}
            onOpenWeeklyCheckIn={onOpenWeeklyCheckIn}
          />
        )}
      </main>

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
          className="is-active"
          aria-current="page"
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
