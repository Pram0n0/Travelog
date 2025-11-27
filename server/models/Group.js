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
  modifiedBy: String
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
