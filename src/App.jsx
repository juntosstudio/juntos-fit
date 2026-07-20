import { useEffect, useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useDashboard } from './hooks/useDashboard'
import { CreatePlanPage } from './pages/CreatePlanPage'
import { DailyCheckInPage } from './pages/DailyCheckInPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { StartCheckInPage } from './pages/StartCheckInPage'
import { getTodayDateKey } from './utils/dates'
import './App.css'

const PAGE_DASHBOARD = 'dashboard'
const PAGE_CREATE_PLAN = 'create-plan'
const PAGE_DAILY_CHECK_IN = 'daily-check-in'
const PAGE_START_CHECK_IN = 'start-check-in'
const PAGE_HISTORY = 'history'

function App() {
  const [currentPage, setCurrentPage] =
    useState(PAGE_DASHBOARD)

  const [activeDate, setActiveDate] = useState(
    getTodayDateKey,
  )

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

  useEffect(() => {
    if (!user?.id) {
      return undefined
    }

    function syncCurrentDate(refresh = false) {
      const nextDate = getTodayDateKey()

      if (nextDate !== activeDate) {
        setActiveDate(nextDate)
        refreshDashboard()
        return
      }

      if (refresh) {
        refreshDashboard()
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        syncCurrentDate(true)
      }
    }

    function handlePageShow() {
      syncCurrentDate(true)
    }

    // Check quietly while the app remains open across midnight.
    const dateTimer = window.setInterval(() => {
      syncCurrentDate()
    }, 60_000)

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )

    window.addEventListener(
      'pageshow',
      handlePageShow,
    )

    return () => {
      window.clearInterval(dateTimer)

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )

      window.removeEventListener(
        'pageshow',
        handlePageShow,
      )
    }
  }, [
    activeDate,
    user?.id,
    refreshDashboard,
  ])

  function returnToDashboard() {
    setCurrentPage(PAGE_DASHBOARD)
  }

  async function handleSignOut() {
    returnToDashboard()

    await signOut()
  }

  if (checkingSession) {
    return (
      <main className="container">
        <h1>Juntos Coach</h1>
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

  if (currentPage === PAGE_CREATE_PLAN) {
    return (
      <CreatePlanPage
        userId={user.id}
        previewOnly={Boolean(
          dashboard?.plan,
        )}
        onSaved={refreshDashboard}
        onBack={returnToDashboard}
      />
    )
  }

  if (currentPage === PAGE_DAILY_CHECK_IN) {
    return (
      <DailyCheckInPage
        key={activeDate}
        plan={dashboard?.plan}
        target={dashboard?.target}
        cardioCompleted={
          dashboard?.cardioCompleted ?? 0
        }
        onSaved={refreshDashboard}
        onBack={returnToDashboard}
      />
    )
  }

  if (currentPage === PAGE_START_CHECK_IN) {
    return (
      <StartCheckInPage
        key={`${activeDate}-${dashboard?.plan?.id ?? 'no-plan'}`}
        plan={dashboard?.plan}
        onSaved={refreshDashboard}
        onBack={returnToDashboard}
      />
    )
  }

  if (currentPage === PAGE_HISTORY) {
    return (
      <main className="container">
        <button
          type="button"
          onClick={returnToDashboard}
        >
          Back to Dashboard
        </button>

        <h1>History</h1>

        <p>
          Daily check-in history will appear here.
        </p>
      </main>
    )
  }

  return (
    <DashboardPage
      dashboard={dashboard}
      loading={loadingDashboard}
      error={dashboardError}
      signingOut={submitting}
      onCreatePlan={() =>
        setCurrentPage(PAGE_CREATE_PLAN)
      }
      onOpenDailyCheckIn={() =>
        setCurrentPage(PAGE_DAILY_CHECK_IN)
      }
      onOpenStartCheckIn={() =>
        setCurrentPage(PAGE_START_CHECK_IN)
      }
      onOpenHistory={() =>
        setCurrentPage(PAGE_HISTORY)
      }
      onSignOut={handleSignOut}
    />
  )
}

export default App
