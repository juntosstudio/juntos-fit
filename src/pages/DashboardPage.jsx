import { formatDate, formatGoal } from '../utils/formatters'

// Displays the signed-in user's active coaching plan summary.
export function DashboardPage({
  dashboard,
  loading,
  error,
  signingOut,
  onOpenDailyCheckIn,
  onOpenHistory,
  onSignOut,
}) {
  if (loading) {
    return (
      <main className="container">
        <h1>Fitness Coach</h1>
        <p>Loading your plan...</p>
      </main>
    )
  }

  return (
    <main className="container">
      <h1>Juntos Coach</h1>

      {error && <p role="alert">{error}</p>}

      {dashboard && (
        <>
          <h2>
            Welcome back, {dashboard.profile.display_name}.
          </h2>

          {dashboard.plan ? (
            <section>
              <p>
                Active plan: {formatGoal(dashboard.plan.goal)}
              </p>

              <p>
                Start date: {formatDate(dashboard.plan.start_date)}
              </p>

              <p>
                Daily calories:{' '}
                {dashboard.target?.calorie_target?.toLocaleString() ??
                  'Not set'}
              </p>

              <p>
                Weekly cardio: {dashboard.cardioCompleted} of{' '}
                {dashboard.target
                  ?.weekly_cardio_target_minutes ?? 0}{' '}
                minutes
              </p>
            </section>
          ) : (
            <p>No active coaching plan was found.</p>
          )}

          <div className="home-menu">
            <button
              type="button"
              onClick={onOpenDailyCheckIn}
              disabled={!dashboard.plan}
            >
              Daily Check-In
            </button>

            <button
              type="button"
              onClick={onOpenHistory}
              disabled={!dashboard.plan}
            >
              History
            </button>

            <button type="button" disabled>
              Weekly Summary
            </button>
          </div>
        </>
      )}

      <button
        type="button"
        onClick={onSignOut}
        disabled={signingOut}
      >
        {signingOut ? 'Signing Out...' : 'Sign Out'}
      </button>
    </main>
  )
}