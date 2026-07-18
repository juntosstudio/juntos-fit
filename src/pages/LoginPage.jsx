import { useState } from 'react'

// Displays the email/password login form.
export function LoginPage({
  submitting,
  error,
  onSignIn,
  onClearError,
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()

    const signedIn = await onSignIn(email, password)

    if (signedIn) {
      // Clear the password after a successful login.
      setPassword('')
    }
  }

  function handleEmailChange(event) {
    onClearError()
    setEmail(event.target.value)
  }

  function handlePasswordChange(event) {
    onClearError()
    setPassword(event.target.value)
  }

  return (
    <main className="container">
      <h1>Fitness Coach</h1>
      <p>Sign in to continue.</p>

      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={handleEmailChange}
            autoComplete="email"
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={handlePasswordChange}
            autoComplete="current-password"
            required
          />
        </label>

        <button type="submit" disabled={submitting}>
          {submitting ? 'Signing In...' : 'Sign In'}
        </button>
      </form>

      {error && <p role="alert">{error}</p>}
    </main>
  )
}