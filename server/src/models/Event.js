const mongoose = require('mongoose')

const ticketSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['free', 'paid'],
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: function() { return this.type === 'paid'; },
    default: 0
  },
  quantity: {
    type: Number,
    default: null // null means unlimited
  },
  description: {
    type: String,
    trim: true
  },
  soldCount: {
    type: Number,
    default: 0
  }
}, { _id: true });

const eventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
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
    address: {
      type: String,
      required: true,
      trim: true
    },
    coordinates: {
      lat: {
        type: Number,
        default: null
      },
      lng: {
        type: Number,
        default: null
      }
    },
    isVirtual: {
      type: Boolean,
      default: false
    }
  },
  tickets: [ticketSchema],
  theme: {
    type: String,
    required: true,
    enum: ['minimal', 'quantum', 'warp', 'emoji', 'confetti', 'pattern'],
    default: 'minimal'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  requireApproval: {
    type: Boolean,
    default: false
  },
  capacity: {
    type: String,
    enum: ['unlimited', 'limited'],
    default: 'unlimited'
  },
  maxCapacity: {
    type: Number,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'createdByModel'
  },
  createdByModel: {
    type: String,
    enum: ['User', 'Vendor'],
    required: true
  },
  attendees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  pendingApprovals: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
    checkIns: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    checkedIn: {
      type: Boolean,
      default: false
    },
    checkedInAt: {
      type: Date,
      default: null
    },
    latitude: {
      type: Number,
      default: null
    },
    longitude: {
      type: Number,
      default: null
    }
  }],
  
  image: {
    type: String,
    default: ''
  },
  coverImage: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('Event', eventSchema) 