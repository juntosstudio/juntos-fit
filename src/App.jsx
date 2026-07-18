import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useDashboard } from './hooks/useDashboard'
import { DailyCheckInPage } from './pages/DailyCheckInPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import './App.css'

const PAGE_DASHBOARD = 'dashboard'
const PAGE_DAILY_CHECK_IN = 'daily-check-in'
const PAGE_HISTORY = 'history'

function App() {
  const [currentPage, setCurrentPage] = useState(PAGE_DASHBOARD)

  const {
    user,
    checkingSession,
    submitting,
    error: authError,
    clearError,
    signIn,
    signOut,
  } = useAuth()

  const {
    dashboard,
    loading: loadingDashboard,
    error: dashboardError,
    refreshDashboard,
  } = useDashboard(user?.id)

  async function handleSignOut() {
    // Return to the dashboard before ending the session.
    setCurrentPage(PAGE_DASHBOARD)

    await signOut()
  }

  if (checkingSession) {
    return (
      <main className="container">
        <h1>Fitness Coach</h1>
        <p>Loading...</p>
      </main>
    )
  }

  if (!user) {
    return (
      <LoginPage
        submitting={submitting}
        error={authError}
        onSignIn={signIn}
        onClearError={clearError}
      />
    )
  }

  if (currentPage === PAGE_DAILY_CHECK_IN) {
    return (
      <DailyCheckInPage
        plan={dashboard?.plan}
        target={dashboard?.target}
        cardioCompleted={dashboard?.cardioCompleted ?? 0}
        onSaved={refreshDashboard}
        onBack={() => setCurrentPage(PAGE_DASHBOARD)}
      />
    )
  }

  if (currentPage === PAGE_HISTORY) {
    return (
      <main className="container">
        <button
          type="button"
          onClick={() => setCurrentPage(PAGE_DASHBOARD)}
        >
          Back to Dashboard
        </button>

        <h1>History</h1>
        <p>Daily check-in history will appear here.</p>
      </main>
    )
  }

  return (
    <DashboardPage
      dashboard={dashboard}
      loading={loadingDashboard}
      error={dashboardError}
      signingOut={submitting}
      onOpenDailyCheckIn={() =>
        setCurrentPage(PAGE_DAILY_CHECK_IN)
      }
      onOpenHistory={() => setCurrentPage(PAGE_HISTORY)}
      onSignOut={handleSignOut}
    />
  )
}

export default App