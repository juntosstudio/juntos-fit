import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  getErrorMessage,
  logDevelopmentError,
} from '../utils/errors'

// Manages the current Supabase session and authentication actions.
export function useAuth() {
  const [session, setSession] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadSession() {
      const { data, error: sessionError } =
        await supabase.auth.getSession()

      if (!isMounted) {
        return
      }

      if (sessionError) {
        logDevelopmentError('useAuth.loadSession', sessionError)
        setError(
          getErrorMessage(
            sessionError,
            'Your session could not be loaded.',
          ),
        )
      }

      setSession(data.session)
      setCheckingSession(false)
    }

    loadSession()

    // Keep React synchronized with login, logout, and token refreshes.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) {
        return
      }

      setSession(newSession)
      setCheckingSession(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Signs in using the email/password account created in Supabase Auth.
  async function signIn(email, password) {
    setSubmitting(true)
    setError('')

    try {
      const { error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

      if (signInError) {
        throw signInError
      }

      return true
    } catch (signInError) {
      logDevelopmentError('useAuth.signIn', signInError)

      setError(
        getErrorMessage(
          signInError,
          'You could not be signed in.',
        ),
      )

      return false
    } finally {
      setSubmitting(false)
    }
  }

  // Ends the current authenticated session.
  async function signOut() {
    setSubmitting(true)
    setError('')

    try {
      const { error: signOutError } =
        await supabase.auth.signOut()

      if (signOutError) {
        throw signOutError
      }

      return true
    } catch (signOutError) {
      logDevelopmentError('useAuth.signOut', signOutError)

      setError(
        getErrorMessage(
          signOutError,
          'You could not be signed out.',
        ),
      )

      return false
    } finally {
      setSubmitting(false)
    }
  }

  return {
    session,
    user: session?.user ?? null,
    checkingSession,
    submitting,
    error,
    clearError: () => setError(''),
    signIn,
    signOut,
  }
}