/**
 * Payment Routes
 * Handles payment creation, confirmation, rejection, reminders, and requests
 */

import express from 'express'
import Group from '../models/Group.js'
import { isAuthenticated } from '../middleware/auth.js'
import { 
  generateId, 
  removeMatchingPaymentRequests,
  hasRequestCooldownPassed,
  hasReminderCooldownPassed
} from '../utils/paymentUtils.js'

const router = express.Router()

/**
 * POST /:groupId/payments - Create a payment (settlement request)
 */
router.post('/:groupId/payments', isAuthenticated, async (req, res) => {
  console.log('POST /:groupId/payments route hit');
  try {
    const { groupId } = req.params;
    const { to, amount, currency } = req.body;
    const username = req.user?.username;

    // Detailed logging for debugging
    console.log('--- Payment Creation Request ---');
    console.log('groupId:', groupId);
    console.log('to:', to);
    console.log('amount:', amount);
    console.log('currency:', currency);
    console.log('username (from session):', username);
    console.log('Request headers:', req.headers);
    console.log('Session:', req.session);

    const group = await Group.findById(groupId);

    if (!group) {
      console.error('Group not found:', groupId);
      return res.status(404).json({ error: 'Group not found' });
    }

    if (!group.members.includes(username)) {
      console.error('User not a member:', username);
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    if (!group.members.includes(to)) {
      console.error('Recipient not a member:', to);
      return res.status(400).json({ error: 'Recipient is not a member of this group' });
    }

    if (amount <= 0) {
      console.error('Invalid amount:', amount);
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const payment = {
      id: generateId(),
      from: username,
      to,
      amount,
      currency: currency || 'USD',
      status: 'pending',
      createdAt: new Date()
    };

    if (!group.payments) {
      group.payments = [];
    }
    group.payments.push(payment);

    // Remove payment requests between these users for this currency
    removeMatchingPaymentRequests(group, username, to, currency);

    await group.save();
    console.log('Payment created and saved:', payment);
    // Return the updated group so frontend can update state
    const updatedGroup = await Group.findById(groupId);
    res.status(201).json(updatedGroup);
  } catch (error) {
    console.error('Error creating payment:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Error creating payment', details: error.message });
  }
})

/**
 * PUT /:groupId/payments/:paymentId - Confirm or reject payment
 */
router.put('/:groupId/payments/:paymentId', isAuthenticated, async (req, res) => {
  try {
    const { groupId, paymentId } = req.params
    const { action } = req.body
    const username = req.user.username

    const group = await Group.findById(groupId)
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    if (!group.members.includes(username)) {
      return res.status(403).json({ error: 'You are not a member of this group' })
    }

    const payment = group.payments.find(p => p.id === paymentId)
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' })
    }

    if (payment.to !== username) {
      return res.status(403).json({ error: 'Only the recipient can confirm or reject this payment' })
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ error: 'This payment has already been processed' })
    }

    if (action === 'confirm') {
      payment.status = 'confirmed';
      payment.confirmedAt = new Date();
      // Remove payment requests in both directions for this currency
      removeMatchingPaymentRequests(group, payment.from, payment.to, payment.currency);

      // Create a settlement expense to reflect the payment
      group.expenses.push({
        id: payment.id,
        description: `Settlement: ${payment.from} paid ${payment.to}`,
        amount: payment.amount,
        currency: payment.currency,
        paidBy: payment.from,
        splitBetween: [payment.from, payment.to],
        splitType: 'custom',
        splitAmounts: {
          [payment.from]: 0,
          [payment.to]: payment.amount
        },
        date: new Date(),
        isSettlement: true,
        settledPaymentId: payment.id
      });

      await group.save();
      // Return updated group for frontend state
      const updatedGroup = await Group.findById(groupId);
      res.json(updatedGroup);
      
    } else if (action === 'reject') {
      payment.status = 'rejected';
      payment.rejectedAt = new Date();
      await group.save();
      // Return updated group for frontend state
      const updatedGroup = await Group.findById(groupId);
      res.json(updatedGroup);
      
    } else {
      return res.status(400).json({ error: 'Invalid action' })
    }
  } catch (error) {
    console.error('Error processing payment:', error)
    res.status(500).json({ error: 'Error processing payment' })
  }
})

/**
 * POST /:groupId/payment-requests - Send payment request to member
 */
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

    if (!group.members.includes(to)) {
      return res.status(400).json({ error: 'Recipient is not a member of this group' })
    }

    // Initialize paymentRequests if not exists
    if (!group.paymentRequests) {
      group.paymentRequests = []
    }

    // Check for existing request
    let request = group.paymentRequests.find(r => 
      r.from === username && r.to === to && r.currency === currency
    )

    if (request) {
      // Check cooldown
      if (!hasRequestCooldownPassed(request)) {
        const timeSinceLastSent = Date.now() - new Date(request.lastSent).getTime()
        const minutesRemaining = Math.ceil((3600000 - timeSinceLastSent) / 60000)
        return res.status(429).json({ 
          error: `Please wait ${minutesRemaining} more minute(s) before sending another request`
        })
      }
      
      // Update existing request
      request.amount = amount
      request.lastSent = new Date()
    } else {
      // Create new request
      request = {
        id: generateId(),
        from: username,
        to,
        amount,
        currency: currency || 'USD',
        lastSent: new Date()
      }
      group.paymentRequests.push(request)
    }

    await group.save()
    res.status(201).json({ message: 'Payment request sent', request })
  } catch (error) {
    console.error('Error sending payment request:', error)
    res.status(500).json({ error: 'Error sending payment request' })
  }
})

/**
 * POST /:groupId/payments/:paymentId/remind - Send reminder for pending payment
 */
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

    const payment = group.payments.find(p => p.id === paymentId)
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' })
    }

    if (payment.from !== username) {
      return res.status(403).json({ error: 'Only the sender can send reminders' })
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ error: 'Can only remind about pending payments' })
    }

    // Check cooldown
    if (!hasReminderCooldownPassed(payment)) {
      const timeSinceLastReminder = Date.now() - new Date(payment.lastReminderSent).getTime()
      const minutesRemaining = Math.ceil((3600000 - timeSinceLastReminder) / 60000)
      return res.status(429).json({ 
        error: `Please wait ${minutesRemaining} more minute(s) before sending another reminder`
      })
    }

    payment.lastReminderSent = new Date()
    await group.save()
    
    res.json({ message: 'Reminder sent', payment })
  } catch (error) {
    console.error('Error sending reminder:', error)
    res.status(500).json({ error: 'Error sending reminder' })
  }
})

/**
 * DELETE /:groupId/payment-requests/:requestId - Dismiss payment request
 */
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

    const requestIndex = group.paymentRequests.findIndex(r => r.id === requestId)
    
    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Payment request not found' })
    }

    const request = group.paymentRequests[requestIndex]
    
    if (request.to !== username) {
      return res.status(403).json({ error: 'Only the recipient can dismiss this request' })
    }

    group.paymentRequests.splice(requestIndex, 1)
    await group.save()
    
    res.json({ message: 'Payment request dismissed' })
  } catch (error) {
    console.error('Error dismissing payment request:', error)
    res.status(500).json({ error: 'Error dismissing payment request' })
  }
})

export default router
