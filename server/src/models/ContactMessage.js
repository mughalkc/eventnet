
// Stores messages submitted from the public Contact Us form.

const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema(
  {
    // Name entered by the user
    name: {
      type: String,
      required: true,
      trim: true
    },

    // Email entered by the user
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },

    // Message entered by the user
    message: {
      type: String,
      required: true,
      trim: true
    
  },
     // If a vendor chose one admin, this holds that admin's id.
    // null = message is for everyone (all admins and vendors can see it)
    targetAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    // Automatically creates createdAt and updatedAt
    timestamps: true
  }
);

module.exports = mongoose.model('ContactMessage', contactMessageSchema);