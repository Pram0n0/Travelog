/**
 * Server-side utility functions for payment requests and reminders
 */

const REMINDER_COOLDOWN_MS = 60 * 60 * 1000 // 1 hour

/**
 * Check if payment request cooldown has passed
 * @param {Object} request - Payment request object
 * @returns {boolean} True if cooldown passed
 */
export function hasRequestCooldownPassed(request) {
  if (!request || !request.lastSent) return true
  
  const timeSinceLastSent = Date.now() - new Date(request.lastSent).getTime()
  return timeSinceLastSent >= REMINDER_COOLDOWN_MS
}

/**
 * Check if payment reminder cooldown has passed
 * @param {Object} payment - Payment object
 * @returns {boolean} True if cooldown passed
 */
export function hasReminderCooldownPassed(payment) {
  if (!payment || !payment.lastReminderSent) return true
  
  const timeSinceLastReminder = Date.now() - new Date(payment.lastReminderSent).getTime()
  return timeSinceLastReminder >= REMINDER_COOLDOWN_MS
}

/**
 * Remove payment requests that match a payment
 * @param {Object} group - Group document
 * @param {string} from - Payer username
 * @param {string} to - Recipient username
 * @param {string} currency - Currency code
 */
export function removeMatchingPaymentRequests(group, from, to, currency) {
  if (!group.paymentRequests) return
  
  group.paymentRequests = group.paymentRequests.filter(req => {
    // Remove requests in both directions for this pair/currency
    const matches = (req.from === from && req.to === to && req.currency === currency) ||
                    (req.from === to && req.to === from && req.currency === currency)
    return !matches
  })
}

/**
 * Generate unique ID for payment/expense
 * @returns {string} Unique ID based on timestamp
 */
export function generateId() {
  return Date.now().toString()
}
