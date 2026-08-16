import { useCallback, useEffect, useState } from 'react'
import { loadDashboardData } from '../services/dashboardService'
import {
  getErrorMessage,
  logDevelopmentError,
} from '../utils/errors'

// Loads and refreshes the signed-in user's dashboard data.
export function useDashboard(userId) {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const refreshDashboard = useCallback(async () => {
    if (!userId) {
      // Clear protected data after sign-out.
      setDashboard(null)
      setLoading(false)
      setError('')
      return null
    }

    setLoading(true)
    setError('')

    try {
      const dashboardData = await loadDashboardData(userId)

      setDashboard(dashboardData)
      return dashboardData
    } catch (loadError) {
      logDevelopmentError('useDashboard', loadError)

      setError(
        getErrorMessage(
          loadError,
          'The dashboard could not be loaded.',
        ),
      )

      setDashboard(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    refreshDashboard()
  }, [refreshDashboard])

  return {
    dashboard,
    loading,
    error,
    refreshDashboard,
  }
}