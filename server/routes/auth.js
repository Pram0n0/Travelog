import express from 'express'
import passport from 'passport'
import User from '../models/User.js'

const router = express.Router()

// Sign up with email/password
router.post('/signup', (req, res, next) => {
  passport.authenticate('local-signup', (err, user, info) => {
    if (err) {
      return res.status(500).json({ error: 'Server error during signup' })
    }
    
    if (!user) {
      return res.status(400).json({ error: info.message || 'Signup failed' })
    }

    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error logging in after signup' })
      }

      const userResponse = {
        id: user._id,
        username: user.username,
        displayName: user.displayName || user.username,
        email: user.email,
        avatar: user.avatar
      }

      return res.status(201).json({ 
        message: 'Signup successful',
        user: userResponse
      })
    })
  })(req, res, next)
})

// Login with email/password
router.post('/login', (req, res, next) => {
  passport.authenticate('local-login', (err, user, info) => {
    if (err) {
      return res.status(500).json({ error: 'Server error during login' })
    }
    
    if (!user) {
      return res.status(401).json({ error: info.message || 'Invalid credentials' })
    }

    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error logging in' })
      }

      const userResponse = {
        id: user._id,
        username: user.username,
        displayName: user.displayName || user.username,
        email: user.email,
        avatar: user.avatar
      }

      return res.json({ 
        message: 'Login successful',
        user: userResponse
      })
    })
  })(req, res, next)
})

// Google OAuth login (only if configured)
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ error: 'Google OAuth not configured' })
  }
  try {
    passport.authenticate('google', {
      scope: ['profile', 'email']
    })(req, res, next)
  } catch (error) {
    console.error('Google OAuth error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Google OAuth callback
router.get('/google/callback', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}?error=oauth_not_configured`)
  }
  passport.authenticate('google', { 
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`,
    failureMessage: true 
  })(req, res, (err) => {
    if (err) {
      console.error('Google OAuth callback error:', err)
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}?error=auth_failed`)
    }
    // Successful authentication, redirect to frontend
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}?auth=success`)
  })
})

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Error logging out' })
    }
    res.json({ message: 'Logout successful' })
  })
})

// Check authentication status
router.get('/status', (req, res) => {
  if (req.isAuthenticated()) {
    const userResponse = {
      id: req.user._id,
      username: req.user.username,
      displayName: req.user.displayName || req.user.username,
      email: req.user.email,
      avatar: req.user.avatar
    }
    return res.json({ authenticated: true, user: userResponse })
  }
  res.json({ authenticated: false })
})

// Update user profile
router.put('/profile', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  try {
    const { displayName, avatar } = req.body
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (displayName !== undefined) {
      user.displayName = displayName.trim() || user.username
    }

    if (avatar !== undefined) {
      user.avatar = avatar.trim()
    }

    await user.save()

    const userResponse = {
      id: user._id,
      username: user.username,
      displayName: user.displayName || user.username,
      email: user.email,
      avatar: user.avatar
    }

    res.json({ message: 'Profile updated successfully', user: userResponse })
  } catch (error) {
    console.error('Error updating profile:', error)
    res.status(500).json({ error: 'Error updating profile' })
  }
})

// Delete current user account (for development)
router.delete('/delete-account', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  try {
    const userId = req.user._id
    await User.findByIdAndDelete(userId)
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: 'Error logging out' })
      }
      res.json({ message: 'Account deleted successfully' })
    })
  } catch (error) {
    res.status(500).json({ error: 'Error deleting account' })
  }
})

export default router
