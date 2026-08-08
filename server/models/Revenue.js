const mongoose = require('mongoose');

const revenueSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  ticketsSold: {
    type: Number,
    default: 0
  },
  // You can add more detailed analytics here
  dailyRevenue: [{
    date: Date,
    amount: Number
  }]
}, { timestamps: true });

module.exports = mongoose.model('Revenue', revenueSchema);
