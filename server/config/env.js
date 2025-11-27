import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from the correct path
const envPath = join(__dirname, '.env')
const result = dotenv.config({ path: envPath })

if (result.error) {
  console.error('❌ Error loading .env:', result.error)
  process.exit(1)
}

console.log('✅ Environment variables loaded')
console.log('📍 .env path:', envPath)
console.log('🔑 GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET')
console.log('🔑 GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET')
