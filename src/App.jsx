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

  useEffect(() => {
    const existingState = window.history.state ?? {}

    window.history.replaceState(
      {
        ...existingState,
        juntosApp: true,
        juntosPage: PAGE_DASHBOARD,
        juntosDepth: 0,
        juntosProgressDetail: null,
        juntosRoute: null,
      },
      '',
    )

    function handlePopState(event) {
      const nextPage = event.state?.juntosPage
      const route = event.state?.juntosRoute ?? {}

      if (!event.state?.juntosApp || !nextPage) {
        return
      }

      if (nextPage === PAGE_WEEKLY_SUMMARY) {
        setWeeklyReviewWeek(
          Number.isFinite(Number(route.weeklyReviewWeek))
            ? Number(route.weeklyReviewWeek)
            : null,
        )
      }

      if ([PAGE_WEEKLY_PREFLIGHT, PAGE_WEEKLY_CHECK_IN].includes(nextPage)) {
        setWeeklyCheckInDate(route.weeklyCheckInDate ?? null)
      }

      if (nextPage === PAGE_DAILY_CHECK_IN) {
        setDailyCheckInDate(route.dailyCheckInDate ?? null)
        setDailyCheckInReturnPage(
          route.dailyCheckInReturnPage ?? PAGE_DASHBOARD,
        )
      }

      if (nextPage === PAGE_CATCH_UP_DAILY) {
        setCatchUpDate(route.catchUpDate ?? null)
        setCatchUpReturnPage(
          route.catchUpReturnPage ?? PAGE_PROGRESS,
        )
      }

      if (nextPage === PAGE_PLAN_ADJUSTMENT) {
        setPlanAdjustmentContext(route.planAdjustmentContext ?? null)
      }

      setCurrentPage(nextPage)
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  function navigateToPage(nextPage, { replace = false, routeState = null } = {}) {
    if (!nextPage || nextPage === currentPage) {
      return
    }

    const currentState = window.history.state ?? {}
    const currentDepth = Number(currentState.juntosDepth) || 0
    const nextState = {
      ...currentState,
      juntosApp: true,
      juntosPage: nextPage,
      juntosDepth: replace ? currentDepth : currentDepth + 1,
      juntosProgressDetail: null,
      juntosRoute: routeState,
    }

    if (replace) {
      window.history.replaceState(nextState, '')
    } else {
      window.history.pushState(nextState, '')
    }

    setCurrentPage(nextPage)
  }

  function goBackPage(fallbackPage = PAGE_DASHBOARD) {
    const currentState = window.history.state ?? {}
    const currentDepth = Number(currentState.juntosDepth) || 0

    if (currentState.juntosApp && currentDepth > 0) {
      window.history.back()
      return true
    }

    if (fallbackPage && fallbackPage !== currentPage) {
      navigateToPage(fallbackPage, { replace: true })
      return true
    }

    return false
  }

  function returnToDashboard() {
    setWeeklyReviewJustCompleted(false)
    setPlanAdjustmentContext(null)
    setWeeklyCheckInDate(null)
    navigateToPage(PAGE_DASHBOARD)
  }

  function openWeeklyReview(weekNumber = null) {
    setWeeklyReviewJustCompleted(false)
    setWeeklyReviewWeek(
      Number.isFinite(Number(weekNumber))
        ? Number(weekNumber)
        : null,
    )
    navigateToPage(PAGE_WEEKLY_SUMMARY, {
      routeState: {
        weeklyReviewWeek: Number.isFinite(Number(weekNumber))
          ? Number(weekNumber)
          : null,
      },
    })
  }

  function openPlanAdjustment({
    weeklyCheckInId,
    weekNumber,
    weeklySubmittedAt,
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
      weeklySubmittedAt:
        weeklySubmittedAt ?? null,
    })

    if (Number.isFinite(Number(weekNumber))) {
      setWeeklyReviewWeek(Number(weekNumber))
    }

    navigateToPage(PAGE_PLAN_ADJUSTMENT, {
      routeState: {
        planAdjustmentContext: {
          weeklyCheckInId,
          weekNumber:
            Number.isFinite(Number(weekNumber))
              ? Number(weekNumber)
              : null,
          weeklySubmittedAt:
            weeklySubmittedAt ?? null,
        },
      },
    })
  }

  function returnFromPlanAdjustment() {
    goBackPage(PAGE_WEEKLY_SUMMARY)
  }

  function openWeeklyCheckIn(
    checkinDate = activeDate,
  ) {
    setWeeklyCheckInDate(
      checkinDate ?? activeDate,
    )
    navigateToPage(
      PAGE_WEEKLY_PREFLIGHT,
      {
        routeState: {
          weeklyCheckInDate: checkinDate ?? activeDate,
        },
      },
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
      navigateToPage(
        PAGE_WEEKLY_SUMMARY,
        {
          replace: true,
          routeState: {
            weeklyReviewWeek: Number(completedWeekly.week_number),
          },
        },
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

    goBackPage(PAGE_DASHBOARD)
  }

  function openDailyCheckIn(
    date = null,
    returnPage = PAGE_DASHBOARD,
  ) {
    setDailyCheckInDate(date)
    setDailyCheckInReturnPage(
      returnPage,
    )
    navigateToPage(
      PAGE_DAILY_CHECK_IN,
      {
        routeState: {
          dailyCheckInDate: date,
          dailyCheckInReturnPage: returnPage,
        },
      },
    )
  }

  function returnFromDailyCheckIn() {
    setDailyCheckInDate(null)
    goBackPage(dailyCheckInReturnPage)
  }

  function openCatchUpDaily(
    date,
    returnPage = PAGE_PROGRESS,
  ) {
    setCatchUpDate(date)
    setCatchUpReturnPage(returnPage)
    navigateToPage(PAGE_CATCH_UP_DAILY, {
      routeState: {
        catchUpDate: date,
        catchUpReturnPage: returnPage,
      },
    })
  }

  function returnFromCatchUp() {
    setCatchUpDate(null)
    goBackPage(catchUpReturnPage)
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
        onBack={() => goBackPage(PAGE_DASHBOARD)}
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
          navigateToPage(
            PAGE_WEEKLY_CHECK_IN,
            {
              routeState: {
                weeklyCheckInDate:
                  weeklyCheckInDate ?? activeDate,
              },
            },
          )
        }
        onBack={() => goBackPage(PAGE_DASHBOARD)}
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
        onBack={() => goBackPage(PAGE_DASHBOARD)}
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
        weeklySubmittedAt={
          planAdjustmentContext?.weeklySubmittedAt
        }
        onBack={returnFromPlanAdjustment}
        onResolved={refreshDashboard}
        onOpenToday={returnToDashboard}
        onOpenHistory={() =>
          navigateToPage(PAGE_PROGRESS)
        }
        onOpenPlan={() =>
          navigateToPage(PAGE_PLAN)
        }
        onOpenSettings={() =>
          navigateToPage(PAGE_SETTINGS)
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
        onBack={() => goBackPage(PAGE_DASHBOARD)}
        onOpenToday={returnToDashboard}
        onOpenHistory={() =>
          navigateToPage(PAGE_PROGRESS)
        }
        onOpenPlan={() =>
          navigateToPage(PAGE_PLAN)
        }
        onOpenSettings={() =>
          navigateToPage(PAGE_SETTINGS)
        }
        onOpenPlanAdjustment={openPlanAdjustment}
        onPlanAdjustmentResolved={refreshDashboard}
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
          navigateToPage(PAGE_PROGRESS)
        }
        onOpenPlan={() =>
          navigateToPage(PAGE_PLAN)
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
          navigateToPage(PAGE_PROGRESS)
        }
        onOpenSettings={() =>
          navigateToPage(PAGE_SETTINGS)
        }
        onCreatePlan={() =>
          navigateToPage(PAGE_CREATE_PLAN)
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
          navigateToPage(PAGE_PROGRESS)
        }
        onOpenPlan={() =>
          navigateToPage(PAGE_PLAN)
        }
        onOpenSettings={() =>
          navigateToPage(PAGE_SETTINGS)
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
          navigateToPage(
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
          navigateToPage(PAGE_PLAN)
        }
        onOpenSettings={() =>
          navigateToPage(
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
        navigateToPage(PAGE_CREATE_PLAN)
      }
      onOpenDailyCheckIn={() =>
        openDailyCheckIn()
      }
      onOpenWeeklyCheckIn={
        openWeeklyCheckIn
      }
      onOpenCurrentWeek={() =>
        navigateToPage(PAGE_CURRENT_WEEK)
      }
      onOpenWeeklyReview={openWeeklyReview}
      onOpenStartCheckIn={() =>
        navigateToPage(PAGE_START_CHECK_IN)
      }
      onOpenHistory={() =>
        navigateToPage(PAGE_PROGRESS)
      }
      onOpenPlan={() =>
        navigateToPage(PAGE_PLAN)
      }
      onOpenSettings={() =>
        navigateToPage(PAGE_SETTINGS)
      }
      onSignOut={handleSignOut}
    />
  )
}

export default App
