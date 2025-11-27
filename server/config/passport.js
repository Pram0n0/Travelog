import passport from 'passport'
import { Strategy as LocalStrategy } from 'passport-local'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import User from '../models/User.js'

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id)
})

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('-password')
    done(null, user)
  } catch (error) {
    done(error, null)
  }
})

// Local Strategy for username/password login
passport.use('local-login', new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password'
  },
  async (email, password, done) => {
    try {
      const user = await User.findOne({ email: email.toLowerCase() })
      
      if (!user) {
        return done(null, false, { message: 'Invalid email or password' })
      }

      const isMatch = await user.comparePassword(password)
      
      if (!isMatch) {
        return done(null, false, { message: 'Invalid email or password' })
      }

      return done(null, user)
    } catch (error) {
      return done(error)
    }
  }
))

// Local Strategy for registration
passport.use('local-signup', new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
  },
  async (req, email, password, done) => {
    try {
      const existingUser = await User.findOne({ 
        $or: [
          { email: email.toLowerCase() },
          { username: req.body.username }
        ]
      })

      if (existingUser) {
        if (existingUser.email === email.toLowerCase()) {
          return done(null, false, { message: 'Email already registered' })
        }
        return done(null, false, { message: 'Username already taken' })
      }

      const newUser = new User({
        username: req.body.username,
        email: email.toLowerCase(),
        password: password
      })

      await newUser.save()
      
      return done(null, newUser)
    } catch (error) {
      return done(error)
    }
  }
))

// Google OAuth Strategy (only if credentials are provided)
console.log('Checking Google OAuth credentials...')
console.log('CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET')
console.log('CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET')

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  console.log('✅ Registering Google OAuth strategy')
  passport.use(new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback',
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists with this Google ID
        let user = await User.findOne({ googleId: profile.id })

        if (user) {
          return done(null, user)
        }

        // Check if user exists with this email
        user = await User.findOne({ email: profile.emails[0].value.toLowerCase() })

        if (user) {
          // Link Google account to existing user
          user.googleId = profile.id
          user.avatar = profile.photos?.[0]?.value || ''
          user.displayName = user.displayName || profile.displayName || user.username
          await user.save()
          return done(null, user)
        }

        // Create new user - use Google display name
        const username = profile.displayName || profile.emails[0].value.split('@')[0]
        
        user = new User({
          googleId: profile.id,
          email: profile.emails[0].value.toLowerCase(),
          username: username,
          displayName: profile.displayName || username,
          avatar: profile.photos?.[0]?.value || ''
        })

        await user.save()
        return done(null, user)
      } catch (error) {
        return done(error)
      }
    }
  ))
} else {
  console.warn('⚠️  Google OAuth not configured - only email/password login available')
}

export default passport
