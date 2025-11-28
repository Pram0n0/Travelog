/**
 * Application-wide constants and configuration
 */

// Payment & Reminder Settings
export const REMINDER_COOLDOWN_MS = 60 * 60 * 1000 // 1 hour in milliseconds
export const REMINDER_COOLDOWN_MINUTES = 60

// Auto-refresh Settings
export const AUTO_REFRESH_INTERVAL_MS = 5000 // 5 seconds

// Default Values
export const DEFAULT_CURRENCY = 'USD'

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Date/Time Formatting
export const DATE_FORMAT_OPTIONS = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
}

// Export Formats
export const CSV_HEADERS = {
  EXPENSES: ['Date', 'Description', 'Amount', 'Currency', 'Paid By', 'Split Between', 'Category']
}
