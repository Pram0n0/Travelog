/**
 * Utility functions for balance calculations
 */

/**
 * Calculate balances for all members across all expenses
 * @param {Array} expenses - List of expenses
 * @param {Array} members - List of group members
 * @returns {Object} Member balances (positive = owed, negative = owes)
 */
export function calculateBalances(expenses, members) {
  const balances = {}
  
  // Initialize balances
  members.forEach(member => {
    balances[member] = 0
  })

  // Calculate net balances
  expenses.forEach(expense => {
    // Add to payers
    if (expense.isMultiplePayers) {
      expense.paidBy.forEach(payer => {
        balances[payer.member] += payer.amount
      })
    } else {
      balances[expense.paidBy] += expense.amount
    }
    
    // Subtract from debtors
    if (expense.splitAmounts) {
      Object.entries(expense.splitAmounts).forEach(([person, amount]) => {
        balances[person] -= amount
      })
    } else {
      const sharePerPerson = expense.amount / (expense.splitBetween?.length || members.length)
      const splitMembers = expense.splitBetween || members
      splitMembers.forEach(person => {
        balances[person] -= sharePerPerson
      })
    }
  })

  return balances
}

/**
 * Calculate balances grouped by currency
 * @param {Array} expenses - List of expenses
 * @param {Array} members - List of group members
 * @param {Array} currencies - List of currencies to calculate
 * @returns {Object} Balances by currency
 */
export function calculateAllBalances(expenses, members, currencies) {
  if (!expenses || !members) return {}
  
  const balancesByCurrency = {}
  
  currencies.forEach(currency => {
    const currencyExpenses = expenses.filter(e => (e.currency || 'USD') === currency)
    balancesByCurrency[currency] = calculateBalances(currencyExpenses, members)
  })

  return balancesByCurrency
}

/**
 * Calculate who owes whom for settlement
 * @param {Object} balances - Member balances
 * @returns {Array} Settlement transactions [{from, to, amount}]
 */
export function calculateSettlements(balances) {
  const settlements = []
  const creditors = []
  const debtors = []

  // Separate creditors and debtors
  Object.entries(balances).forEach(([member, balance]) => {
    if (balance > 0.01) {
      creditors.push({ member, amount: balance })
    } else if (balance < -0.01) {
      debtors.push({ member, amount: -balance })
    }
  })

  // Match debtors to creditors
  let i = 0
  let j = 0
  
  while (i < debtors.length && j < creditors.length) {
    const debt = debtors[i].amount
    const credit = creditors[j].amount
    const settled = Math.min(debt, credit)

    settlements.push({
      from: debtors[i].member,
      to: creditors[j].member,
      amount: settled
    })

    debtors[i].amount -= settled
    creditors[j].amount -= settled

    if (debtors[i].amount < 0.01) i++
    if (creditors[j].amount < 0.01) j++
  }

  return settlements
}

/**
 * Calculate who specific user owes and who owes them
 * @param {Object} balances - Member balances
 * @param {string} currentUser - Username
 * @returns {Object} {userOwes, userOwedBy} mapping member to amount
 */
export function calculateUserBalances(balances, currentUser) {
  const settlements = calculateSettlements(balances)
  const userOwes = {}
  const userOwedBy = {}

  settlements.forEach(settlement => {
    if (settlement.from === currentUser) {
      userOwes[settlement.to] = (userOwes[settlement.to] || 0) + settlement.amount
    }
    if (settlement.to === currentUser) {
      userOwedBy[settlement.from] = (userOwedBy[settlement.from] || 0) + settlement.amount
    }
  })

  return { userOwes, userOwedBy }
}
