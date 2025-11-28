/**
 * Group Routes - Base Operations
 * Handles group creation, joining, and member management
 */

import express from 'express'
import Group from '../models/Group.js'
import { isAuthenticated } from '../middleware/auth.js'

const router = express.Router()

/**
 * GET / - Get all groups for current user
 */
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

/**
 * POST / - Create a new group
 */
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
      currencies: ['USD'],
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

/**
 * POST /join - Join a group by code
 */
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

/**
 * POST /:id/leave - Leave a group
 */
router.post('/:id/leave', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params
    const username = req.user.username

    const group = await Group.findById(id)
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    if (!group.members.includes(username)) {
      return res.status(400).json({ error: 'You are not a member of this group' })
    }

    // Check if user has unsettled balances
    const balances = {}
    group.members.forEach(member => {
      balances[member] = 0
    })

    group.expenses.forEach(expense => {
      if (expense.isMultiplePayers) {
        expense.paidBy.forEach(payer => {
          balances[payer.member] += payer.amount
        })
      } else {
        balances[expense.paidBy] += expense.amount
      }
      
      if (expense.splitAmounts) {
        Object.entries(expense.splitAmounts).forEach(([person, amount]) => {
          balances[person] -= amount
        })
      }
    })

    const userBalance = balances[username] || 0
    if (Math.abs(userBalance) > 0.01) {
      return res.status(400).json({ 
        error: 'Cannot leave group with unsettled balances. Please settle all debts first.' 
      })
    }

    // Remove user from group
    group.members = group.members.filter(m => m !== username)
    
    // If no members left, delete the group
    if (group.members.length === 0) {
      await Group.findByIdAndDelete(id)
      return res.json({ message: 'Group deleted as all members have left' })
    }

    await group.save()
    res.json({ message: 'Successfully left the group' })
  } catch (error) {
    console.error('Error leaving group:', error)
    res.status(500).json({ error: 'Error leaving group' })
  }
})

export default router
