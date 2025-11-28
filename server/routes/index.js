/**
 * Master Routes Index
 * Combines all route modules for clean organization
 */

import express from 'express'
import groupRoutes from './groups.js'
import expenseRoutes from './expenses.js'
import paymentRoutes from './payments.js'

const router = express.Router()

// Mount route modules
router.use('/', groupRoutes)           // Group operations (/, /join, /:id/leave)
router.use('/', expenseRoutes)         // Expense operations (/:groupId/expenses/*)
router.use('/', paymentRoutes)         // Payment operations (/:groupId/payments/*, /:groupId/payment-requests/*)

export default router
