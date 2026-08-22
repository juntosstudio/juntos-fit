import { useEffect, useRef, useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useDashboard } from './hooks/useDashboard'
import { CreatePlanPage } from './pages/CreatePlanPage'
import { CheckInSettingsPage } from './pages/CheckInSettingsPage'
import { DailyCheckInPage } from './pages/DailyCheckInPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { PlanPage } from './pages/PlanPage'
import { StartCheckInPage } from './pages/StartCheckInPage'
import { WeeklyCheckInPage } from './pages/WeeklyCheckInPage'
import { WeeklySummaryPage } from './pages/WeeklySummaryPage'
import { CurrentWeekPage } from './pages/CurrentWeekPage'
import { ProgressPage } from './pages/ProgressPage'
import { WeeklyPreflightPage } from './pages/WeeklyPreflightPage'
import { PlanAdjustmentPage } from './pages/PlanAdjustmentPage'
import { CatchUpDailyCheckInPage } from './pages/CatchUpDailyCheckInPage'
import { getTodayDateKey } from './utils/dates'
import './App.css'

const PAGE_DASHBOARD = 'dashboard'
const PAGE_CREATE_PLAN = 'create-plan'
const PAGE_DAILY_CHECK_IN = 'daily-check-in'
const PAGE_WEEKLY_PREFLIGHT = 'weekly-preflight'
const PAGE_WEEKLY_CHECK_IN = 'weekly-check-in'
const PAGE_WEEKLY_SUMMARY = 'weekly-summary'
const PAGE_START_CHECK_IN = 'start-check-in'
const PAGE_PROGRESS = 'progress'
const PAGE_CURRENT_WEEK = 'current-week'
const PAGE_CATCH_UP_DAILY = 'catch-up-daily'
const PAGE_PLAN = 'plan'
const PAGE_SETTINGS = 'settings'
const PAGE_PLAN_ADJUSTMENT = 'plan-adjustment'

function App() {
  const [currentPage, setCurrentPage] =
    useState(PAGE_DASHBOARD)

  const [weeklyReviewWeek, setWeeklyReviewWeek] =
    useState(null)

  const [
    weeklyReviewJustCompleted,
    setWeeklyReviewJustCompleted,
  ] = useState(false)

  const [
    weeklyCheckInDate,
    setWeeklyCheckInDate,
  ] = useState(null)

  // Final Weekly submit refreshes the dashboard first, then
  // routes directly to Weekly Review. The Weekly page still
  // calls its normal onBack callback after submit, so this ref
  // suppresses that one stale return-to-dashboard call.
  const weeklyCompletionRedirectRef =
    useRef(false)

  const [activeDate, setActiveDate] = useState(
    getTodayDateKey,
  )

  const [
    dailyCheckInDate,
    setDailyCheckInDate,
  ] = useState(null)
  const [
    dailyCheckInReturnPage,
    setDailyCheckInReturnPage,
  ] = useState(PAGE_DASHBOARD)

  const [catchUpDate, setCatchUpDate] =
    useState(null)
  const [catchUpReturnPage, setCatchUpReturnPage] =
    useState(PAGE_PROGRESS)

  const [
    planAdjustmentContext,
    setPlanAdjustmentContext,
  ] = useState(null)

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
    setWeeklyReviewJustCompleted(false)
    setPlanAdjustmentContext(null)
    setWeeklyCheckInDate(null)
    setCurrentPage(PAGE_DASHBOARD)
  }

  function openWeeklyReview(weekNumber = null) {
    setWeeklyReviewJustCompleted(false)
    setWeeklyReviewWeek(
      Number.isFinite(Number(weekNumber))
        ? Number(weekNumber)
        : null,
    )
    setCurrentPage(PAGE_WEEKLY_SUMMARY)
  }

  function openPlanAdjustment({
    weeklyCheckInId,
    weekNumber,
  }) {
    if (!weeklyCheckInId) {
      return
    }

    setPlanAdjustmentContext({
      weeklyCheckInId,
      weekNumber:
        Number.isFinite(Number(weekNumber))
          ? Number(weekNumber)
          : null,
    })

    if (Number.isFinite(Number(weekNumber))) {
      setWeeklyReviewWeek(Number(weekNumber))
    }

    setCurrentPage(PAGE_PLAN_ADJUSTMENT)
  }

  function returnFromPlanAdjustment() {
    setCurrentPage(PAGE_WEEKLY_SUMMARY)
  }

  function openWeeklyCheckIn(
    checkinDate = activeDate,
  ) {
    setWeeklyCheckInDate(
      checkinDate ?? activeDate,
    )
    setCurrentPage(
      PAGE_WEEKLY_PREFLIGHT,
    )
  }

  async function handleWeeklySaved(
    completedCheckIn = null,
  ) {
    const refreshedDashboard =
      await refreshDashboard()

    const completedWeekly =
      completedCheckIn?.status ===
        'completed'
        ? completedCheckIn
        : refreshedDashboard
            ?.todayWeeklyCheckIn

    if (
      completedWeekly?.status ===
        'completed' &&
      Number.isFinite(
        Number(
          completedWeekly
            ?.week_number,
        ),
      )
    ) {
      weeklyCompletionRedirectRef.current =
        true

      setWeeklyReviewWeek(
        Number(
          completedWeekly
            .week_number,
        ),
      )
      setWeeklyReviewJustCompleted(true)
      setCurrentPage(
        PAGE_WEEKLY_SUMMARY,
      )
    }

    return refreshedDashboard
  }

  function handleWeeklyBack() {
    if (
      weeklyCompletionRedirectRef.current
    ) {
      weeklyCompletionRedirectRef.current =
        false
      return
    }

    returnToDashboard()
  }

  function openDailyCheckIn(
    date = null,
    returnPage = PAGE_DASHBOARD,
  ) {
    setDailyCheckInDate(date)
    setDailyCheckInReturnPage(
      returnPage,
    )
    setCurrentPage(
      PAGE_DAILY_CHECK_IN,
    )
  }

  function returnFromDailyCheckIn() {
    setDailyCheckInDate(null)
    setCurrentPage(
      dailyCheckInReturnPage,
    )
  }

  function openCatchUpDaily(
    date,
    returnPage = PAGE_PROGRESS,
  ) {
    setCatchUpDate(date)
    setCatchUpReturnPage(returnPage)
    setCurrentPage(PAGE_CATCH_UP_DAILY)
  }

  function returnFromCatchUp() {
    setCatchUpDate(null)
    setCurrentPage(catchUpReturnPage)
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
    const selectedDailyDate =
      dailyCheckInDate ?? activeDate
    const editingHistoricalDaily =
      Boolean(dailyCheckInDate)

    return (
      <DailyCheckInPage
        key={`${selectedDailyDate}-${dashboard?.plan?.id ?? 'no-plan'}`}
        plan={dashboard?.plan}
        target={dashboard?.target}
        cardioCompleted={
          dashboard?.cardioCompleted ?? 0
        }
        settings={dashboard?.settings}
        checkinDate={
          dailyCheckInDate
        }
        completionReturnLabel={
          editingHistoricalDaily
            ? 'Back to Daily Check-Ins'
            : 'Back to Dashboard'
        }
        onSaved={refreshDashboard}
        onBack={returnFromDailyCheckIn}
      />
    )
  }

  if (currentPage === PAGE_CATCH_UP_DAILY) {
    return (
      <CatchUpDailyCheckInPage
        key={`${catchUpDate}-${dashboard?.plan?.id ?? 'no-plan'}`}
        plan={dashboard?.plan}
        target={dashboard?.target}
        cardioCompleted={
          dashboard?.cardioCompleted ?? 0
        }
        settings={dashboard?.settings}
        checkinDate={catchUpDate}
        fromWeeklyPreflight={
          catchUpReturnPage ===
          PAGE_WEEKLY_PREFLIGHT
        }
        onSaved={refreshDashboard}
        onBack={returnFromCatchUp}
      />
    )
  }

  if (currentPage === PAGE_WEEKLY_PREFLIGHT) {
    return (
      <WeeklyPreflightPage
        key={`${weeklyCheckInDate ?? activeDate}-${dashboard?.plan?.id ?? 'no-plan'}`}
        userId={user.id}
        plan={dashboard?.plan}
        profile={dashboard?.profile}
        checkinDate={
          weeklyCheckInDate ?? activeDate
        }
        onCompleteDay={(date) =>
          openCatchUpDaily(
            date,
            PAGE_WEEKLY_PREFLIGHT,
          )
        }
        onContinue={() =>
          setCurrentPage(
            PAGE_WEEKLY_CHECK_IN,
          )
        }
        onBack={returnToDashboard}
      />
    )
  }

  if (currentPage === PAGE_WEEKLY_CHECK_IN) {
    return (
      <WeeklyCheckInPage
        key={`${weeklyCheckInDate ?? activeDate}-${dashboard?.plan?.id ?? 'no-plan'}`}
        plan={dashboard?.plan}
        profile={dashboard?.profile}
        target={dashboard?.target}
        cardioCompleted={
          dashboard?.cardioCompleted ?? 0
        }
        settings={dashboard?.settings}
        checkinDate={
          weeklyCheckInDate ?? activeDate
        }
        weekSummary={
          dashboard?.weekAtAGlance ?? null
        }
        onSaved={handleWeeklySaved}
        onBack={handleWeeklyBack}
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

  if (currentPage === PAGE_PLAN_ADJUSTMENT) {
    return (
      <PlanAdjustmentPage
        weeklyCheckInId={
          planAdjustmentContext?.weeklyCheckInId
        }
        weekNumber={
          planAdjustmentContext?.weekNumber
        }
        onBack={returnFromPlanAdjustment}
        onResolved={refreshDashboard}
        onOpenToday={returnToDashboard}
        onOpenHistory={() =>
          setCurrentPage(PAGE_PROGRESS)
        }
        onOpenPlan={() =>
          setCurrentPage(PAGE_PLAN)
        }
        onOpenSettings={() =>
          setCurrentPage(PAGE_SETTINGS)
        }
      />
    )
  }

  if (currentPage === PAGE_WEEKLY_SUMMARY) {
    return (
      <WeeklySummaryPage
        plan={dashboard?.plan}
        profile={dashboard?.profile}
        initialWeekNumber={weeklyReviewWeek}
        justCompleted={
          weeklyReviewJustCompleted
        }
        onBack={returnToDashboard}
        onOpenToday={returnToDashboard}
        onOpenHistory={() =>
          setCurrentPage(PAGE_PROGRESS)
        }
        onOpenPlan={() =>
          setCurrentPage(PAGE_PLAN)
        }
        onOpenSettings={() =>
          setCurrentPage(PAGE_SETTINGS)
        }
        onOpenPlanAdjustment={openPlanAdjustment}
      />
    )
  }

  if (currentPage === PAGE_SETTINGS) {
    return (
      <CheckInSettingsPage
        userId={user.id}
        profile={dashboard?.profile}
        initialSettings={
          dashboard?.settings
        }
        onSaved={refreshDashboard}
        onOpenToday={returnToDashboard}
        onOpenHistory={() =>
          setCurrentPage(PAGE_PROGRESS)
        }
        onOpenPlan={() =>
          setCurrentPage(PAGE_PLAN)
        }
      />
    )
  }

  if (currentPage === PAGE_PLAN) {
    return (
      <PlanPage
        dashboard={dashboard}
        onOpenToday={returnToDashboard}
        onOpenHistory={() =>
          setCurrentPage(PAGE_PROGRESS)
        }
        onOpenSettings={() =>
          setCurrentPage(PAGE_SETTINGS)
        }
        onCreatePlan={() =>
          setCurrentPage(PAGE_CREATE_PLAN)
        }
      />
    )
  }

  if (currentPage === PAGE_CURRENT_WEEK) {
    return (
      <CurrentWeekPage
        plan={dashboard?.plan}
        profile={dashboard?.profile}
        settings={dashboard?.settings}
        onCompleteDay={(date) =>
          openCatchUpDaily(
            date,
            PAGE_CURRENT_WEEK,
          )
        }
        onOpenDailyCheckIn={() =>
          openDailyCheckIn(
            null,
            PAGE_CURRENT_WEEK,
          )
        }
        onEditDay={(date) =>
          openDailyCheckIn(
            date,
            PAGE_CURRENT_WEEK,
          )
        }
        onOpenWeeklyCheckIn={() =>
          openWeeklyCheckIn(activeDate)
        }
        onOpenToday={returnToDashboard}
        onOpenHistory={() =>
          setCurrentPage(PAGE_PROGRESS)
        }
        onOpenPlan={() =>
          setCurrentPage(PAGE_PLAN)
        }
        onOpenSettings={() =>
          setCurrentPage(PAGE_SETTINGS)
        }
      />
    )
  }

  if (currentPage === PAGE_PROGRESS) {
    return (
      <ProgressPage
        dashboard={dashboard}
        onOpenToday={returnToDashboard}
        onOpenCurrentWeek={() =>
          setCurrentPage(
            PAGE_CURRENT_WEEK,
          )
        }
        onOpenWeeklyReview={
          openWeeklyReview
        }
        onOpenWeeklyCheckIn={
          openWeeklyCheckIn
        }
        onOpenPlan={() =>
          setCurrentPage(PAGE_PLAN)
        }
        onOpenSettings={() =>
          setCurrentPage(
            PAGE_SETTINGS,
          )
        }
      />
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
        openDailyCheckIn()
      }
      onOpenWeeklyCheckIn={
        openWeeklyCheckIn
      }
      onOpenCurrentWeek={() =>
        setCurrentPage(PAGE_CURRENT_WEEK)
      }
      onOpenWeeklyReview={openWeeklyReview}
      onOpenStartCheckIn={() =>
        setCurrentPage(PAGE_START_CHECK_IN)
      }
      onOpenHistory={() =>
        setCurrentPage(PAGE_PROGRESS)
      }
      onOpenPlan={() =>
        setCurrentPage(PAGE_PLAN)
      }
      onOpenSettings={() =>
        setCurrentPage(PAGE_SETTINGS)
      }
      onSignOut={handleSignOut}
    />
  )
}

export default App
