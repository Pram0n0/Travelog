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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isSignUp) {
        // Sign up
        if (!username || !email || !password) {
          setError('All fields are required')
          setLoading(false)
          return
        }

        const response = await authAPI.signup(username, email, password)
        onLogin(response.user)
      } else {
        // Sign in
        if (!email || !password) {
          setError('Email and password are required')
          setLoading(false)
          return
        }

        const response = await authAPI.login(email, password)
        onLogin(response.user)
      }
    } catch (err) {
      setError(err.message || 'Authentication failed')
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
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
          >
            Sign In
          </button>
          <button 
            className={isSignUp ? 'active' : ''}
            onClick={() => { setIsSignUp(true); setError(''); }}
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

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="divider">
          <span>OR</span>
        </div>

        <button onClick={handleGoogleLogin} className="google-button" disabled={loading}>
          <span>🔐</span> Continue with Google
        </button>
      </div>
    </div>
  )
}

export default Auth
