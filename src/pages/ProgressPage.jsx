import {
  useEffect,
} from 'react'
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
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    } catch {
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }
  }, [])

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
            weightHistory={dashboard?.planProgress?.weightHistory ?? []}
            allWeightHistory={dashboard?.planProgress?.allWeightHistory ?? []}
            photoMarkers={dashboard?.planProgress?.photoMarkers ?? []}
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
