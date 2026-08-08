const mongoose = require('mongoose')

const eventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  coverImage: {
    type: String,
    default: ''
  },
  theme: {
    type: String,
    enum: ['minimal', 'quantum', 'warp', 'emoji', 'confetti', 'pattern'],
    default: 'minimal'
  },
  capacity: {
    type: String,
    enum: ['unlimited', 'limited'],
    default: 'unlimited'
  },
  maxCapacity: {
    type: Number,
    required: function() {
      return this.capacity === 'limited'
    }
  },
  requireApproval: {
    type: Boolean,
    default: false
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed'],
    default: 'published'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hostName: {
    type: String,
    required: true
  },
  hostEmail: {
    type: String,
    required: true
  },
  hostAvatar: {
    type: String
  },
  attendees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  tickets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket'
  }],
  tags: [String],
  category: {
    type: String,
    enum: ['conference', 'workshop', 'seminar', 'networking', 'other'],
    default: 'other'
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'unlisted'],
    default: 'public'
  },
  registrationDeadline: Date,
  cancellationPolicy: String,
  additionalInformation: String,
  faqs: [{
    question: String,
    answer: String
  }]
}, {
  timestamps: true
})

// Virtual for checking if registration is open
eventSchema.virtual('isRegistrationOpen').get(function() {
  if (this.registrationDeadline) {
    return new Date() < this.registrationDeadline
  }
  return true
})

// Virtual for checking if event is full
eventSchema.virtual('isFull').get(function() {
  if (this.capacity === 'limited') {
    return this.attendees.length >= this.maxCapacity
  }
  return false
})

// Virtual for remaining spots
eventSchema.virtual('remainingSpots').get(function() {
  if (this.capacity === 'limited') {
    return Math.max(0, this.maxCapacity - this.attendees.length)
  }
  return null
})

module.exports = mongoose.model('Event', eventSchema) 