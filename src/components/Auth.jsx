import { useState } from 'react'
import { authAPI } from '../api/index.js'
import './Auth.css'

function Auth({ onLogin }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Trim inputs
      const trimmedEmail = email.trim()
      const trimmedPassword = password.trim()
      const trimmedUsername = username.trim()

      if (isSignUp) {
        // Sign up validation
        if (!trimmedUsername || !trimmedEmail || !trimmedPassword) {
          setError('All fields are required')
          setLoading(false)
          return
        }

        if (trimmedUsername.length < 3) {
          setError('Username must be at least 3 characters')
          setLoading(false)
          return
        }

        if (trimmedPassword.length < 6) {
          setError('Password must be at least 6 characters')
          setLoading(false)
          return
        }

        const response = await authAPI.signup(trimmedUsername, trimmedEmail, trimmedPassword)
        onLogin(response.user)
      } else {
        // Sign in validation
        if (!trimmedEmail || !trimmedPassword) {
          setError('Email and password are required')
          setLoading(false)
          return
        }

        const response = await authAPI.login(trimmedEmail, trimmedPassword)
        onLogin(response.user)
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.')
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    setIsGoogleLoading(true)
    authAPI.googleLogin()
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>💰 Travelog</h1>
        <p className="auth-subtitle">Track and split shared expenses with ease</p>

        <div className="auth-tabs">
          <button 
            className={!isSignUp ? 'active' : ''}
            onClick={() => { setIsSignUp(false); setError(''); }}
            disabled={loading || isGoogleLoading}
          >
            Sign In
          </button>
          <button 
            className={isSignUp ? 'active' : ''}
            onClick={() => { setIsSignUp(true); setError(''); }}
            disabled={loading || isGoogleLoading}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {isSignUp && (
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="error-message">{error}</p>}

          <button type="submit" className="auth-button" disabled={loading || isGoogleLoading}>
            {loading ? (
              <span>⏳ Please wait...</span>
            ) : (
              isSignUp ? 'Create Account' : 'Sign In'
            )}
          </button>
        </form>

        {!isSignUp && (
          <>
            <div className="divider">
              <span>OR</span>
            </div>

            <button onClick={handleGoogleLogin} className="google-button" disabled={loading || isGoogleLoading}>
              {isGoogleLoading ? (
                <span>⏳ Redirecting...</span>
              ) : (
                <><span>🔐</span> Continue with Google</>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default Auth
