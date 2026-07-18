// Converts Supabase, Postgres, and normal JavaScript errors into readable text.
export function getErrorMessage(
  error,
  fallbackMessage = 'Something went wrong.',
) {
  if (!error) {
    return fallbackMessage
  }

  const details = [
    error.message,
    error.details,
    error.hint,
    error.code ? `Code: ${error.code}` : null,
  ]
    .filter(Boolean)
    .join(' | ')

  return details || fallbackMessage
}

// Logs full errors in development without exposing them in production.
export function logDevelopmentError(context, error) {
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error)
  }
}