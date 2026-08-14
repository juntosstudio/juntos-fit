import {
  useEffect,
  useRef,
  useState,
} from 'react'
import { registerSW } from 'virtual:pwa-register'
import '../styles/pwaUpdate.css'

const UPDATE_CHECK_INTERVAL_MS =
  60 * 60 * 1000

const UPDATE_CHECK_THROTTLE_MS =
  60 * 1000

const REMIND_LATER_MS =
  60 * 60 * 1000

export function PwaUpdatePrompt() {
  const [showPrompt, setShowPrompt] =
    useState(false)

  const [refreshing, setRefreshing] =
    useState(false)

  const updateServiceWorkerRef =
    useRef(null)

  const updateAvailableRef =
    useRef(false)

  const remindAfterRef =
    useRef(0)

  useEffect(() => {
    let registration = null
    let serviceWorkerUrl = null
    let intervalId = null
    let lastCheckAt = 0
    let disposed = false

    async function checkForUpdate() {
      if (
        !registration ||
        !serviceWorkerUrl ||
        registration.installing
      ) {
        return
      }

      if (!navigator.onLine) {
        return
      }

      const now = Date.now()

      if (
        now - lastCheckAt <
        UPDATE_CHECK_THROTTLE_MS
      ) {
        return
      }

      lastCheckAt = now

      try {
        const response = await fetch(
          serviceWorkerUrl,
          {
            cache: 'no-store',
            headers: {
              cache: 'no-store',
              'cache-control': 'no-cache',
            },
          },
        )

        if (response.ok) {
          await registration.update()
        }
      } catch (error) {
        console.info(
          'Juntos Fit update check skipped.',
          error,
        )
      }
    }

    function maybeShowReminder() {
      if (
        updateAvailableRef.current &&
        Date.now() >= remindAfterRef.current
      ) {
        setShowPrompt(true)
      }
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        'visible'
      ) {
        maybeShowReminder()
        checkForUpdate()
      }
    }

    function handlePageShow() {
      maybeShowReminder()
      checkForUpdate()
    }

    updateServiceWorkerRef.current =
      registerSW({
        immediate: true,

        onNeedRefresh() {
          if (disposed) {
            return
          }

          updateAvailableRef.current =
            true

          remindAfterRef.current = 0
          setShowPrompt(true)
        },

        onRegisteredSW(
          swUrl,
          swRegistration,
        ) {
          serviceWorkerUrl = swUrl
          registration = swRegistration

          if (!registration) {
            return
          }

          intervalId =
            window.setInterval(
              checkForUpdate,
              UPDATE_CHECK_INTERVAL_MS,
            )
        },

        onRegisterError(error) {
          console.error(
            'Juntos Fit service worker registration failed.',
            error,
          )
        },
      })

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )

    window.addEventListener(
      'pageshow',
      handlePageShow,
    )

    return () => {
      disposed = true

      if (intervalId) {
        window.clearInterval(intervalId)
      }

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )

      window.removeEventListener(
        'pageshow',
        handlePageShow,
      )
    }
  }, [])

  function handleLater() {
    remindAfterRef.current =
      Date.now() + REMIND_LATER_MS

    setShowPrompt(false)
  }

  async function handleRefresh() {
    if (!updateServiceWorkerRef.current) {
      window.location.reload()
      return
    }

    setRefreshing(true)

    try {
      await updateServiceWorkerRef.current(
        true,
      )
    } catch (error) {
      console.error(
        'Juntos Fit refresh failed.',
        error,
      )

      window.location.reload()
    }
  }

  if (!showPrompt) {
    return null
  }

  return (
    <section
      className="pwa-update-toast"
      role="alertdialog"
      aria-labelledby="pwa-update-title"
      aria-describedby="pwa-update-message"
    >
      <div className="pwa-update-copy">
        <h2 id="pwa-update-title">
          New version available
        </h2>

        <p id="pwa-update-message">
          Refresh Juntos Fit to get the
          latest version.
        </p>
      </div>

      <div className="pwa-update-actions">
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing
            ? 'Refreshing…'
            : 'Refresh Now'}
        </button>

        <button
          type="button"
          className="pwa-update-later"
          onClick={handleLater}
          disabled={refreshing}
        >
          Later
        </button>
      </div>
    </section>
  )
}
