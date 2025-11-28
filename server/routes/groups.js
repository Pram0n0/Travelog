import express from 'express'
import Group from '../models/Group.js'

const router = express.Router()

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next()
  }
  res.status(401).json({ error: 'Not authenticated' })
}

// Get all groups for the current user
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const username = req.user.username
    const groups = await Group.find({ members: username })
    res.json(groups)
  } catch (error) {
    console.error('Error fetching groups:', error)
    res.status(500).json({ error: 'Error fetching groups' })
  }
})

// Create a new group
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { name } = req.body
    const username = req.user.username

    // Generate a 6-character code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()

    const group = new Group({
      name,
      code,
      members: [username],
      currencies: ['USD'], // Default currency
      expenses: [],
      createdBy: username
    })

    await group.save()
    res.status(201).json(group)
  } catch (error) {
    console.error('Error creating group:', error)
    res.status(500).json({ error: 'Error creating group' })
  }
})

// Join a group by code
router.post('/join', isAuthenticated, async (req, res) => {
  try {
    const { code } = req.body
    const username = req.user.username

    const group = await Group.findOne({ code: code.toUpperCase() })
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    if (group.members.includes(username)) {
      return res.status(400).json({ error: 'You are already a member of this group' })
    }

    group.members.push(username)
    await group.save()
    
    res.json(group)
  } catch (error) {
    console.error('Error joining group:', error)
    res.status(500).json({ error: 'Error joining group' })
  }
})

// Add an expense to a group
router.post('/:groupId/expenses', isAuthenticated, async (req, res) => {
  try {
    const { groupId } = req.params
    const username = req.user.username

    const group = await Group.findById(groupId)
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    if (!group.members.includes(username)) {
      return res.status(403).json({ error: 'You are not a member of this group' })
    }

    const expenseData = req.body
    const expense = {
      id: Date.now().toString(),
      ...expenseData,
      currency: expenseData.currency || 'USD',
      date: new Date(),
      createdBy: username
    }

    group.expenses.push(expense)

    // Add currency to group's currencies array if not already present
    if (expense.currency && !group.currencies.includes(expense.currency)) {
      group.currencies.push(expense.currency)
    }

    await group.save()
    res.status(201).json(group)
  } catch (error) {
    console.error('Error adding expense:', error)
    res.status(500).json({ error: 'Error adding expense' })
  }
})

// Edit an expense
router.put('/:groupId/expenses/:expenseId', isAuthenticated, async (req, res) => {
  try {
    const { groupId, expenseId } = req.params
    const username = req.user.username

    const group = await Group.findById(groupId)
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    if (!group.members.includes(username)) {
      return res.status(403).json({ error: 'You are not a member of this group' })
    }

    const expenseIndex = group.expenses.findIndex(e => e.id === expenseId)
    
    if (expenseIndex === -1) {
      return res.status(404).json({ error: 'Expense not found' })
    }

    const updatedExpenseData = req.body
    group.expenses[expenseIndex] = {
      ...group.expenses[expenseIndex].toObject(),
      ...updatedExpenseData,
      currency: updatedExpenseData.currency || group.expenses[expenseIndex].currency || 'USD',
      modifiedDate: new Date(),
      modifiedBy: username
    }

    // Add currency to group's currencies array if not already present
    const newCurrency = group.expenses[expenseIndex].currency
    if (newCurrency && !group.currencies.includes(newCurrency)) {
      group.currencies.push(newCurrency)
    }

    await group.save()
    res.json(group)
  } catch (error) {
    console.error('Error editing expense:', error)
    res.status(500).json({ error: 'Error editing expense' })
  }
})

// Delete an expense
router.delete('/:groupId/expenses/:expenseId', isAuthenticated, async (req, res) => {
  try {
    const { groupId, expenseId } = req.params
    const username = req.user.username

    const group = await Group.findById(groupId)
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    if (!group.members.includes(username)) {
      return res.status(403).json({ error: 'You are not a member of this group' })
    }

    const expenseIndex = group.expenses.findIndex(e => e.id === expenseId)
    
    if (expenseIndex === -1) {
      return res.status(404).json({ error: 'Expense not found' })
    }

    group.expenses.splice(expenseIndex, 1)
    
    // Rebuild currencies array based on remaining expenses
    const usedCurrencies = [...new Set(group.expenses.map(e => e.currency || 'USD'))]
    if (usedCurrencies.length === 0) {
      group.currencies = ['USD'] // Default if no expenses
    } else {
      group.currencies = usedCurrencies
    }

    await group.save()
    res.json(group)
  } catch (error) {
    console.error('Error deleting expense:', error)
    res.status(500).json({ error: 'Error deleting expense' })
  }
})

// Create a payment (settlement request)
router.post('/:groupId/payments', isAuthenticated, async (req, res) => {
  try {
    const { groupId } = req.params
    const { to, amount, currency } = req.body
    const username = req.user.username

    const group = await Group.findById(groupId)
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    if (!group.members.includes(username)) {
      return res.status(403).json({ error: 'You are not a member of this group' })
    }

    if (!group.members.includes(to)) {
      return res.status(400).json({ error: 'Recipient is not a member of this group' })
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' })
    }

    const payment = {
      id: Date.now().toString(),
      from: username,
      to,
      amount,
      currency: currency || 'USD',
      status: 'pending',
      createdAt: new Date()
    }

    if (!group.payments) {
      group.payments = []
    }
    group.payments.push(payment)

    // Remove any payment requests between these two people for this currency
    if (group.paymentRequests) {
      group.paymentRequests = group.paymentRequests.filter(r => 
        !(r.from === to && r.to === username && r.currency === currency)
      )
    }

    await group.save()
    res.status(201).json(group)
  } catch (error) {
    console.error('Error creating payment:', error)
    res.status(500).json({ error: 'Error creating payment' })
  }
})

// Confirm or reject a payment
router.put('/:groupId/payments/:paymentId', isAuthenticated, async (req, res) => {
  try {
    const { groupId, paymentId } = req.params
    const { action } = req.body // 'confirm' or 'reject'
    const username = req.user.username

    const group = await Group.findById(groupId)
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    if (!group.members.includes(username)) {
      return res.status(403).json({ error: 'You are not a member of this group' })
    }

    const paymentIndex = group.payments.findIndex(p => p.id === paymentId)
    
    if (paymentIndex === -1) {
      return res.status(404).json({ error: 'Payment not found' })
    }

    const payment = group.payments[paymentIndex]

    // Only the recipient can confirm or reject
    if (payment.to !== username) {
      return res.status(403).json({ error: 'Only the payment recipient can confirm or reject' })
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ error: 'Payment has already been processed' })
    }

    if (action === 'confirm') {
      // Mark payment as confirmed
      group.payments[paymentIndex].status = 'confirmed'
      group.payments[paymentIndex].confirmedAt = new Date()

      // Create a settlement expense
      const settlementExpense = {
        id: Date.now().toString(),
        description: `Settlement: ${payment.from} paid ${payment.to}`,
        amount: payment.amount,
        currency: payment.currency,
        paidBy: payment.from,
        splitBetween: [payment.to],
        splitType: 'unequally',
        splitAmounts: {
          [payment.to]: payment.amount
        },
        date: new Date(),
        createdBy: username, // Confirmed by recipient
        isSettlement: true,
        settledPaymentId: payment.id
      }

      group.expenses.push(settlementExpense)

      // Add currency to group if not present
      if (!group.currencies.includes(payment.currency)) {
        group.currencies.push(payment.currency)
      }

      // Remove payment requests between these two people for this currency
      if (group.paymentRequests) {
        group.paymentRequests = group.paymentRequests.filter(r => 
          !((r.from === payment.to && r.to === payment.from && r.currency === payment.currency) ||
            (r.from === payment.from && r.to === payment.to && r.currency === payment.currency))
        )
      }
    } else if (action === 'reject') {
      group.payments[paymentIndex].status = 'rejected'
      group.payments[paymentIndex].rejectedAt = new Date()
    } else {
      return res.status(400).json({ error: 'Invalid action. Use "confirm" or "reject"' })
    }

    await group.save()
    res.json(group)
  } catch (error) {
    console.error('Error processing payment:', error)
    res.status(500).json({ error: 'Error processing payment' })
  }
})

// Leave a group
router.post('/:id/leave', isAuthenticated, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    const username = req.user.username

    // Check if user is a member
    if (!group.members.includes(username)) {
      return res.status(400).json({ error: 'You are not a member of this group' })
    }

    // Calculate user's balance across all currencies
    const currencies = [...new Set(group.expenses.map(e => e.currency || 'USD'))]
    let hasOutstandingBalances = false

    currencies.forEach(currency => {
      const currencyExpenses = group.expenses.filter(e => (e.currency || 'USD') === currency)
      let balance = 0

      currencyExpenses.forEach(expense => {
        // Add what user paid
        if (expense.isMultiplePayers) {
          const userPayment = expense.paidBy.find(p => p.member === username)
          if (userPayment) {
            balance += userPayment.amount
          }
        } else if (expense.paidBy === username) {
          balance += expense.amount
        }

        // Subtract what user owes
        if (expense.splitAmounts && expense.splitAmounts[username]) {
          balance -= expense.splitAmounts[username]
        } else if (expense.splitBetween && expense.splitBetween.includes(username)) {
          balance -= expense.amount / expense.splitBetween.length
        } else if (!expense.splitBetween) {
          // Split among all members
          balance -= expense.amount / group.members.length
        }
      })

      // If balance is non-zero (owes money OR is owed money), can't leave
      if (Math.abs(balance) > 0.01) {
        hasOutstandingBalances = true
      }
    })

    if (hasOutstandingBalances) {
      return res.status(400).json({ error: 'You cannot leave the group while you have outstanding balances. Please settle all debts first.' })
    }

    // Remove user from members
    group.members = group.members.filter(m => m !== username)
    
    await group.save()
    res.json({ message: 'Successfully left the group', group })
  } catch (error) {
    console.error('Error leaving group:', error)
    res.status(500).json({ error: 'Error leaving group' })
  }
})

// Send payment request (initial reminder to pay)
router.post('/:groupId/payment-requests', isAuthenticated, async (req, res) => {
  try {
    const { groupId } = req.params
    const { to, amount, currency } = req.body
    const username = req.user.username

    const group = await Group.findById(groupId)
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    if (!group.members.includes(username)) {
      return res.status(403).json({ error: 'You are not a member of this group' })
    }

    const ONE_HOUR = 60 * 60 * 1000
    const now = new Date()

    if (!group.paymentRequests) {
      group.paymentRequests = []
    }

    // Find existing request
    const existingRequest = group.paymentRequests.find(r => 
      r.from === username && r.to === to && r.currency === currency
    )

    if (existingRequest) {
      // Check 1 hour cooldown on existing request
      const timeSinceLastSent = now - existingRequest.lastSent
      if (timeSinceLastSent < ONE_HOUR) {
        const minutesRemaining = Math.ceil((ONE_HOUR - timeSinceLastSent) / 60000)
        return res.status(429).json({ 
          error: `Please wait ${minutesRemaining} more minute${minutesRemaining !== 1 ? 's' : ''} before sending another reminder` 
        })
      }
      
      // Update existing request
      existingRequest.lastSent = now
      existingRequest.amount = amount
    } else {
      // Create new request
      group.paymentRequests.push({
        id: Date.now().toString(),
        from: username,
        to,
        amount,
        currency,
        lastSent: now
      })
    }

    await group.save()

    res.json({ 
      message: 'Payment request sent successfully',
      group
    })
  } catch (error) {
    console.error('Error sending payment request:', error)
    res.status(500).json({ error: 'Error sending payment request' })
  }
})

// Send reminder for pending payment
router.post('/:groupId/payments/:paymentId/remind', isAuthenticated, async (req, res) => {
  try {
    const { groupId, paymentId } = req.params
    const username = req.user.username

    const group = await Group.findById(groupId)
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    if (!group.members.includes(username)) {
      return res.status(403).json({ error: 'You are not a member of this group' })
    }

    const payment = group.payments.id(paymentId)
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' })
    }

    // Only the person being owed (payment.to) can send reminders
    if (payment.to !== username) {
      return res.status(403).json({ error: 'Only the recipient can send reminders' })
    }

    // Check if payment is still pending
    if (payment.status !== 'pending') {
      return res.status(400).json({ error: 'Can only remind for pending payments' })
    }

    // Check 1 hour cooldown
    const ONE_HOUR = 60 * 60 * 1000
    const now = new Date()
    if (payment.lastReminderSent) {
      const timeSinceLastReminder = now - payment.lastReminderSent
      if (timeSinceLastReminder < ONE_HOUR) {
        const minutesRemaining = Math.ceil((ONE_HOUR - timeSinceLastReminder) / 60000)
        return res.status(429).json({ 
          error: `Please wait ${minutesRemaining} more minute${minutesRemaining !== 1 ? 's' : ''} before sending another reminder` 
        })
      }
    }

    // Update last reminder timestamp
    payment.lastReminderSent = now
    await group.save()

    res.json({ 
      message: 'Reminder sent successfully',
      payment: payment.toObject(),
      group
    })
  } catch (error) {
    console.error('Error sending reminder:', error)
    res.status(500).json({ error: 'Error sending reminder' })
  }
})

// Dismiss/clear a payment request
router.delete('/:groupId/payment-requests/:requestId', isAuthenticated, async (req, res) => {
  try {
    const { groupId, requestId } = req.params
    const username = req.user.username

    const group = await Group.findById(groupId)
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    if (!group.members.includes(username)) {
      return res.status(403).json({ error: 'You are not a member of this group' })
    }

    if (!group.paymentRequests) {
      return res.status(404).json({ error: 'No payment requests found' })
    }

    // Find and remove the request
    const initialLength = group.paymentRequests.length
    group.paymentRequests = group.paymentRequests.filter(r => r.id !== requestId)
    
    if (group.paymentRequests.length === initialLength) {
      return res.status(404).json({ error: 'Payment request not found' })
    }

    await group.save()

    res.json({ 
      message: 'Payment request dismissed',
      group
    })
  } catch (error) {
    console.error('Error dismissing payment request:', error)
    res.status(500).json({ error: 'Error dismissing payment request' })
  }
})

export default router
