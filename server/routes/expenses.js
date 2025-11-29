/**
 * Expense Routes
 * Handles expense creation, editing, and deletion
 */

import express from 'express'
import Group from '../models/Group.js'
import { isAuthenticated } from '../middleware/auth.js'
import { generateId } from '../utils/paymentUtils.js'

const router = express.Router()

/**
 * POST /:groupId/expenses - Add expense to group
 */
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
      id: generateId(),
      ...expenseData,
      currency: expenseData.currency || 'USD',
      date: new Date(),
      createdBy: username
    }

    group.expenses.push(expense)
    await group.save()
    
    res.status(201).json(expense)
  } catch (error) {
    console.error('Error adding expense:', error)
    res.status(500).json({ error: 'Error adding expense' })
  }
})

/**
 * PUT /:groupId/expenses/:expenseId - Edit an expense
 */
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

    // Allow any member to edit for currency conversion only
    const updatedExpenseData = req.body;
    const isCurrencyConversion = updatedExpenseData.currency && updatedExpenseData.currency !== group.expenses[expenseIndex].currency;
    if (group.expenses[expenseIndex].createdBy !== username && !isCurrencyConversion) {
      return res.status(403).json({ error: 'Only the creator can edit this expense' });
    }
    const updatedExpense = {
      ...group.expenses[expenseIndex],
      ...updatedExpenseData,
      id: expenseId,
      date: group.expenses[expenseIndex].date,
      createdBy: username
    }

    group.expenses[expenseIndex] = updatedExpense
    await group.save()
    
    res.json(updatedExpense)
  } catch (error) {
    console.error('Error updating expense:', error)
    res.status(500).json({ error: 'Error updating expense' })
  }
})

/**
 * DELETE /:groupId/expenses/:expenseId - Delete an expense
 */
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

    // Only creator can delete
    if (group.expenses[expenseIndex].createdBy !== username) {
      return res.status(403).json({ error: 'Only the creator can delete this expense' })
    }

    group.expenses.splice(expenseIndex, 1)
    await group.save()
    
    res.json({ message: 'Expense deleted successfully' })
  } catch (error) {
    console.error('Error deleting expense:', error)
    res.status(500).json({ error: 'Error deleting expense' })
  }
})

export default router
