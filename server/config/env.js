import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from the correct path
const envPath = join(__dirname, '.env')
const result = dotenv.config({ path: envPath })

// In production (Render/Vercel), .env file won't exist - use platform's env vars instead
if (result.error && process.env.NODE_ENV !== 'production') {
  console.error('❌ Error loading .env:', result.error)
  console.error('💡 Make sure you have a .env file in server/config/ for local development')
  process.exit(1)
} else if (result.error) {
  console.log('ℹ️  No .env file found (expected in production - using platform environment variables)')
} else {
  console.log('✅ Environment variables loaded from .env file')
  console.log('📍 .env path:', envPath)
}

console.log('🔑 GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET')
console.log('🔑 GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET')
