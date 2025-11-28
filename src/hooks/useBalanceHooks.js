/**
 * Custom React hooks for common functionality
 */

import { useState, useEffect, useMemo } from 'react'
import {  REMINDER_COOLDOWN_MS } from '../config/constants'

/**
 * Hook to manage payment reminder state and logic
 * @param {Array} pendingPayments - List of pending payments
 * @param {Array} paymentRequests - List of payment requests
 * @param {string} currentUser - Current username
 * @returns {Object} Reminder state and helpers
 */
export function usePaymentReminders(pendingPayments, paymentRequests, currentUser) {
  const [sendingReminder, setSendingReminder] = useState(null)
  
  // Filter payment requests for current user
  const requestsForMe = useMemo(() => {
    if (!paymentRequests || !currentUser) return []
    
    return paymentRequests.filter(request => {
      if (request.to !== currentUser) return false
      
      const hasPendingPayment = pendingPayments.some(p => 
        p.from === request.from && 
        p.to === currentUser && 
        p.status === 'pending' &&
        p.currency === request.currency
      )
      
      return !hasPendingPayment
    })
  }, [paymentRequests, currentUser, pendingPayments])
  
  // Filter pending payments that need user response
  const paymentsToRespond = useMemo(() => {
    if (!pendingPayments || !currentUser) return []
    return pendingPayments.filter(p => p.to === currentUser && p.status === 'pending')
  }, [pendingPayments, currentUser])
  
  return {
    sendingReminder,
    setSendingReminder,
    requestsForMe,
    paymentsToRespond
  }
}

/**
 * Hook to extract unique currencies from expenses
 * @param {Array} expenses - List of expenses
 * @returns {Array} Sorted list of unique currencies
 */
export function useCurrencies(expenses) {
  return useMemo(() => {
    if (!expenses || expenses.length === 0) return ['USD']
    const currencySet = new Set(expenses.map(e => e.currency || 'USD'))
    return Array.from(currencySet).sort()
  }, [expenses])
}

/**
 * Hook to manage currency selection
 * @param {Array} currencies - Available currencies
 * @returns {Object} Selected currency and setter
 */
export function useCurrencySelection(currencies) {
  const [selectedCurrency, setSelectedCurrency] = useState('all')
  
  // Auto-correct if selected currency is no longer available
  useEffect(() => {
    if (selectedCurrency !== 'all' && !currencies.includes(selectedCurrency)) {
      setSelectedCurrency('all')
    }
  }, [currencies, selectedCurrency])
  
  return { selectedCurrency, setSelectedCurrency }
}

/**
 * Hook to filter expenses by currency
 * @param {Array} expenses - All expenses
 * @param {string} selectedCurrency - Selected currency or 'all'
 * @returns {Array} Filtered expenses
 */
export function useFilteredExpenses(expenses, selectedCurrency) {
  return useMemo(() => {
    if (!expenses || expenses.length === 0) return []
    if (selectedCurrency === 'all') return expenses
    return expenses.filter(e => (e.currency || 'USD') === selectedCurrency)
  }, [expenses, selectedCurrency])
}
