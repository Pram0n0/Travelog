/**
 * Utility functions for payment reminders and requests
 */

import { REMINDER_COOLDOWN_MS, REMINDER_COOLDOWN_MINUTES } from '../config/constants'

/**
 * Check if enough time has passed to send another payment reminder
 * @param {Object} payment - Payment object with lastReminderSent
 * @returns {boolean} True if can send reminder
 */
export function canSendPaymentReminder(payment) {
  if (!payment || !payment.lastReminderSent) return true
  
  const lastSent = new Date(payment.lastReminderSent)
  const now = new Date()
  const timeDiff = now - lastSent
  
  return timeDiff >= REMINDER_COOLDOWN_MS
}

/**
 * Check if can send payment request to a member for a currency
 * @param {string} member - Member username
 * @param {string} currency - Currency code
 * @param {Array} paymentRequests - List of all payment requests
 * @returns {boolean} True if can send request
 */
export function canSendPaymentRequest(member, currency, paymentRequests) {
  if (!paymentRequests || paymentRequests.length === 0) return true
  
  const request = paymentRequests.find(r => r.to === member && r.currency === currency)
  if (!request || !request.lastSent) return true
  
  const lastSent = new Date(request.lastSent)
  const now = new Date()
  const timeDiff = now - lastSent
  
  return timeDiff >= REMINDER_COOLDOWN_MS
}

/**
 * Calculate minutes remaining until next reminder can be sent
 * @param {Date} lastSent - Last reminder sent date
 * @returns {number} Minutes remaining (rounded up)
 */
export function getMinutesUntilNextReminder(lastSent) {
  if (!lastSent) return 0
  
  const lastSentDate = new Date(lastSent)
  const now = new Date()
  const timeDiff = now - lastSentDate
  const timeRemaining = REMINDER_COOLDOWN_MS - timeDiff
  
  if (timeRemaining <= 0) return 0
  
  return Math.ceil(timeRemaining / (60 * 1000))
}

/**
 * Get time until next payment reminder for a specific payment
 * @param {Object} payment - Payment object with lastReminderSent
 * @returns {number} Minutes remaining
 */
export function getTimeUntilNextPaymentReminder(payment) {
  if (!payment || !payment.lastReminderSent) return 0
  return getMinutesUntilNextReminder(payment.lastReminderSent)
}

/**
 * Get time until next payment request for member/currency
 * @param {string} member - Member username
 * @param {string} currency - Currency code
 * @param {Array} paymentRequests - List of payment requests
 * @returns {number} Minutes remaining
 */
export function getTimeUntilNextPaymentRequest(member, currency, paymentRequests) {
  if (!paymentRequests || paymentRequests.length === 0) return 0
  
  const request = paymentRequests.find(r => r.to === member && r.currency === currency)
  if (!request || !request.lastSent) return 0
  
  return getMinutesUntilNextReminder(request.lastSent)
}

/**
 * Filter payment requests for current user, excluding those with existing pending payments
 * @param {Array} paymentRequests - All payment requests
 * @param {string} currentUser - Current username
 * @param {Array} pendingPayments - All pending payments
 * @returns {Array} Filtered payment requests
 */
export function filterPaymentRequestsForUser(paymentRequests, currentUser, pendingPayments) {
  if (!paymentRequests || paymentRequests.length === 0) return []
  
  return paymentRequests.filter(request => {
    // Only requests for current user
    if (request.to !== currentUser) return false
    
    // Exclude if there's already a pending payment
    const hasPendingPayment = pendingPayments.some(p => 
      p.from === request.from && 
      p.to === currentUser && 
      p.status === 'pending' &&
      p.currency === request.currency
    )
    
    return !hasPendingPayment
  })
}
