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
<header className="login-header">
  <h1>Juntos Coach</h1>
  <p></p>
  <p>Sign in to continue.</p>
</header>

<form className="login-form" onSubmit={handleSubmit}>
  <div className="login-row">
    <label htmlFor="login-email" className="login-label">
      Email:
    </label>

    <input
      id="login-email"
      name="username"
      type="email"
      value={email}
      onChange={handleEmailChange}
      autoComplete="username"
      autoCapitalize="none"
      spellCheck="false"
      required
    />
  </div>

  <div className="login-row">
    <label
      htmlFor="login-password"
      className="login-label"
    >
      Password:
    </label>

    <input
      id="login-password"
      name="password"
      type="password"
      value={password}
      onChange={handlePasswordChange}
      autoComplete="current-password"
      required
    />
  </div>

  <div className="login-actions">
    <button type="submit" disabled={submitting}>
      {submitting ? 'Signing In...' : 'Sign In'}
    </button>
  </div>
</form>

{error && <p role="alert">{error}</p>}
    </main>
  )
}