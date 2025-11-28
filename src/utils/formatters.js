/**
 * Formatting utility functions
 */

/**
 * Format currency amount with symbol
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @param {number} decimals - Number of decimal places (default 2)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = 'USD', decimals = 2) {
  return `${currency} ${amount.toFixed(decimals)}`
}

/**
 * Format date to readable string
 * @param {Date|string} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDate(date, options = {}) {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }
  return dateObj.toLocaleString('en-US', { ...defaultOptions, ...options })
}

/**
 * Format member list to readable string
 * @param {Array} members - List of member names
 * @param {number} maxDisplay - Maximum members to show before truncating
 * @returns {string} Formatted member list
 */
export function formatMemberList(members, maxDisplay = 3) {
  if (!members || members.length === 0) return ''
  if (members.length <= maxDisplay) return members.join(', ')
  
  const displayed = members.slice(0, maxDisplay).join(', ')
  const remaining = members.length - maxDisplay
  return `${displayed} +${remaining} more`
}

/**
 * Generate CSV from expenses data
 * @param {Array} expenses - List of expenses
 * @returns {string} CSV string
 */
export function generateExpensesCSV(expenses) {
  if (!expenses || expenses.length === 0) return ''
  
  const headers = ['Date', 'Description', 'Amount', 'Currency', 'Paid By', 'Split Between', 'Category']
  const rows = expenses.map(expense => {
    const date = formatDate(expense.date, { hour: undefined, minute: undefined })
    const paidBy = expense.isMultiplePayers 
      ? expense.paidBy.map(p => `${p.member} (${p.amount})`).join('; ')
      : expense.paidBy
    const splitBetween = expense.splitAmounts
      ? Object.entries(expense.splitAmounts).map(([member, amount]) => `${member} (${amount})`).join('; ')
      : (expense.splitBetween || []).join(', ')
    
    return [
      date,
      expense.description,
      expense.amount,
      expense.currency || 'USD',
      paidBy,
      splitBetween,
      expense.category || ''
    ]
  })
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')
  
  return csvContent
}
