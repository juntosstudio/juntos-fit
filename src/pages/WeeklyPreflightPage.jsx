import {
  useEffect,
  useState,
} from 'react'
import {
  loadWeeklyPreflight,
  markDailyDataUnavailable,
} from '../services/checkInHistoryService'
import {
  formatDate,
} from '../utils/formatters'
import '../styles/checkInHistory.css'

export function WeeklyPreflightPage({
  userId,
  plan,
  checkinDate,
  onCompleteDay,
  onContinue,
  onBack,
}) {
  const [preflight, setPreflight] =
    useState(null)
  const [loading, setLoading] =
    useState(true)
  const [error, setError] =
    useState('')
  const [confirmDate, setConfirmDate] =
    useState(null)
  const [resolvingDate, setResolvingDate] =
    useState(null)

  async function load() {
    if (!plan?.id) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const next =
        await loadWeeklyPreflight(
          plan,
          checkinDate,
        )
      setPreflight(next)
    } catch (loadError) {
      setError(
        loadError?.message ||
          'Your Weekly Check-In could not be prepared.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // This screen remounts when returning from catch-up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.id, checkinDate])

  useEffect(() => {
    if (
      !loading &&
      preflight?.bypass &&
      !error
    ) {
      onContinue()
    }
  }, [
    error,
    loading,
    onContinue,
    preflight?.bypass,
  ])

  async function markUnavailable(date) {
    setResolvingDate(date)
    setError('')

    try {
      await markDailyDataUnavailable({
        userId,
        plan,
        checkinDate: date,
      })
      setConfirmDate(null)
      await load()
    } catch (resolutionError) {
      setError(
        resolutionError?.message ||
          'That day could not be marked unavailable.',
      )
    } finally {
      setResolvingDate(null)
    }
  }

  if (loading || preflight?.bypass) {
    return (
      <main className="container weekly-preflight-page">
        <button
          type="button"
          className="text-button"
          onClick={onBack}
        >
          ← Back to Today
        </button>

        <h1>Weekly Check-In</h1>
        <p>
          {loading
            ? 'Checking this week’s Daily Check-Ins...'
            : 'Opening your Weekly Check-In...'}
        </p>
      </main>
    )
  }

  if (preflight?.expired) {
    return (
      <main className="container weekly-preflight-page">
        <button
          type="button"
          className="text-button"
          onClick={onBack}
        >
          ← Back to Today
        </button>

        <h1>Weekly Check-In Closed</h1>
        <p>
          Week {preflight.weekNumber} is outside the late-check-in window.
          Your existing plan stays in place until the next Weekly Check-In.
        </p>
      </main>
    )
  }

  if (!plan) {
    return (
      <main className="container weekly-preflight-page">
        <button
          type="button"
          className="text-button"
          onClick={onBack}
        >
          ← Back to Today
        </button>
        <h1>Weekly Check-In</h1>
        <p role="alert">
          No active coaching plan was found.
        </p>
      </main>
    )
  }

  return (
    <main className="container weekly-preflight-page">
      <button
        type="button"
        className="text-button"
        onClick={onBack}
      >
        ← Back to Today
      </button>

      <header className="weekly-preflight-header">
        <h1>
          Before We Close Week{' '}
          {preflight?.weekNumber}
        </h1>

        <p>
          Before you can complete this Weekly, finish
          any missing Daily Check-Ins below. After you
          save each Daily, Juntos will bring you back
          here automatically.
        </p>
      </header>

      {error && <p role="alert">{error}</p>}

      <section className="weekly-preflight-card">
        <h2>
          Missing Daily Check-Ins
        </h2>

        <div className="weekly-preflight-items">
          {preflight?.unresolvedDailyDates?.map(
            (date) => (
              <article
                className="weekly-preflight-item"
                key={date}
              >
                <div>
                  <strong>Missing Daily Check-In</strong>
                  <span>{formatDate(date)}</span>
                </div>

                <div className="weekly-preflight-actions">
                  <button
                    type="button"
                    onClick={() =>
                      onCompleteDay(date)
                    }
                  >
                    Complete Missing Daily
                  </button>

                  {confirmDate !== date ? (
                    <button
                      type="button"
                      className="text-button"
                      onClick={() =>
                        setConfirmDate(date)
                      }
                    >
                      I Don’t Have This Data
                    </button>
                  ) : (
                    <div className="weekly-preflight-confirm">
                      <p>
                        Mark this date as unavailable
                        instead of guessing?
                      </p>

                      <div>
                        <button
                          type="button"
                          className="text-button"
                          disabled={
                            resolvingDate === date
                          }
                          onClick={() =>
                            setConfirmDate(null)
                          }
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          disabled={
                            resolvingDate === date
                          }
                          onClick={() =>
                            markUnavailable(date)
                          }
                        >
                          {resolvingDate === date
                            ? 'Saving...'
                            : 'Confirm No Data'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            ),
          )}
        </div>
      </section>

      <button
        type="button"
        className="weekly-preflight-continue"
        disabled={
          Boolean(
            preflight?.unresolvedDailyDates
              ?.length,
          )
        }
        onClick={onContinue}
      >
        Continue to Weekly Check-In
      </button>
    </main>
  )
}
