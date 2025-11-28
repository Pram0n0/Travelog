import mongoose from 'mongoose'

const expenseSchema = new mongoose.Schema({
  id: String,
  description: String,
  amount: Number,
  currency: {
    type: String,
    default: 'USD'
  },
  paidBy: String,
  isMultiplePayers: Boolean,
  splitBetween: [String],
  splitType: String,
  splitAmounts: mongoose.Schema.Types.Mixed,
  date: {
    type: Date,
    default: Date.now
  },
  createdBy: String,
  modifiedDate: Date,
  modifiedBy: String,
  // Mark if this is a settlement payment
  isSettlement: {
    type: Boolean,
    default: false
  },
  settledPaymentId: String // Reference to the payment that created this settlement
})

const paymentSchema = new mongoose.Schema({
  id: String,
  from: {
    type: String,
    required: true
  },
  to: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'rejected'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  confirmedAt: Date,
  rejectedAt: Date,
  lastReminderSent: Date // Track when last reminder was sent (1 hour cooldown)
})

const paymentRequestSchema = new mongoose.Schema({
  id: String,
  from: String, // Person requesting payment
  to: String, // Person being asked to pay
  amount: Number,
  currency: String,
  lastSent: {
    type: Date,
    default: Date.now
  }
})

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  members: [{
    type: String,
    required: true
  }],
  currencies: {
    type: [String],
    default: ['USD']
  },
  expenses: [expenseSchema],
  payments: [paymentSchema], // Track pending/confirmed payments
  paymentRequests: [paymentRequestSchema], // Track payment reminders/requests
  createdBy: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

const Group = mongoose.model('Group', groupSchema)

export default Group
