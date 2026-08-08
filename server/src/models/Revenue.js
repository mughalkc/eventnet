const mongoose = require('mongoose')

const revenueSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  ticket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  fee: {
    type: Number,
    required: true,
    default: 0
  },
  netAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  },
  paidDate: {
    type: Date,
    default: null
  },
  paymentMethod: {
    type: String,
    default: 'stripe'
  },
  transactionId: {
    type: String,
    default: null
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('Revenue', revenueSchema)
