const mongoose = require('mongoose')

const ticketPurchaseSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ticketType: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  ticketInfo: {
    name: String,
    type: String,
    price: Number
  },
  quantity: {
    type: Number,
    required: true,
    default: 1
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentId: {
    type: String,
    default: null
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'free', 'other'],
    default: 'free'
  },
  ticketCode: {
    type: String,
    required: true,
    unique: true
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  usedAt: {
    type: Date,
    default: null
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

// Generate a unique ticket code
ticketPurchaseSchema.pre('save', async function(next) {
  if (!this.isModified('ticketCode')) {
    return next()
  }
  
  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }
  
  let isUnique = false
  let ticketCode = ''
  
  while (!isUnique) {
    ticketCode = generateCode()
    const existingTicket = await this.constructor.findOne({ ticketCode })
    if (!existingTicket) {
      isUnique = true
    }
  }
  
  this.ticketCode = ticketCode
  next()
})

module.exports = mongoose.model('Ticket', ticketPurchaseSchema)
