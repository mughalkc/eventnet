const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['free', 'paid'],
    required: true
  },
  price: {
    type: Number,
    required: function() {
      return this.type === 'paid';
    }
  },
  quantity: {
    type: Number,
    required: true
  },
  sold: {
    type: Number,
    default: 0
  },
  description: String,
  salesStart: Date,
  salesEnd: Date
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);
