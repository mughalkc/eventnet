
const express = require('express');
const router = express.Router();

const ContactMessage = require('../models/ContactMessage');
const { verifyToken, verifyAdmin, verifyVendor } = require('../middleware/auth');
const emailService = require('../utils/emailService');


router.post('/', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        message: 'All fields are required'
      });
    }

    // Save message permanently in MongoDB

    const contactMessage = await ContactMessage.create({
      name,
      email,
      message
    });

    // Send email notification
    // This keeps your existing email/Resend functionality.
    // Even if email sending fails, the database message remains
    // safely stored.

    try {
      await emailService.sendEmail({
        to: process.env.EMAIL_USER,
        subject: `Contact Form: ${name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2>New Contact Message</h2>

            <p>
              <strong>Name:</strong>
              ${name}
            </p>

            <p>
              <strong>Email:</strong>
              ${email}
            </p>

            <p>
              <strong>Message:</strong>
            </p>

            <p>
              ${message}
            </p>
          </div>
        `
      });
    } catch (emailError) {
      // Do NOT delete the database message if email fails.
      console.error('Contact email error:', emailError);
    }

    // Return success to ContactUs.jsx
    res.status(201).json({
      message: 'Message sent successfully',
      contactMessage
    });

  } catch (error) {
    console.error('Contact form error:', error);

    res.status(500).json({
      message: 'Failed to save contact message'
    });
  }
});

// Admin + Vendor can view all Contact Us messages.

router.get(
  '/',
  verifyToken,
  async (req, res, next) => {

    try {
      
      // Allow ONLY admin or vendor

      if (req.user.role !== 'admin' && req.user.role !== 'vendor') {
        return res.status(403).json({
          message: 'Access denied'
        });
      }

      next();

    } catch (error) {
      console.error('Contact access error:', error);

      res.status(500).json({
        message: 'Failed to verify access'
      });
    }
  },
  async (req, res) => {

    try {
      // Get newest messages first
      const messages = await ContactMessage.find()
        .sort({ createdAt: -1 });

      res.json(messages);

    } catch (error) {
      console.error('Fetch contact messages error:', error);

      res.status(500).json({
        message: 'Failed to fetch contact messages'
      });
    }
  }
);

// Admin + Vendor can delete a Contact Us message.
// One click from dashboard will permanently remove the
// selected message from MongoDB.


router.delete(
  '/:id',
  verifyToken,
  async (req, res) => {

    try {
      
      // Only Admin and Vendor are allowed to delete.
      
      if (req.user.role !== 'admin' && req.user.role !== 'vendor') {
        return res.status(403).json({
          message: 'Access denied'
        });
      }

      // Delete selected message
      const deletedMessage = await ContactMessage.findByIdAndDelete(
        req.params.id
      );

      // Message not found
      if (!deletedMessage) {
        return res.status(404).json({
          message: 'Contact message not found'
        });
      }

      res.json({
        message: 'Contact message deleted successfully'
      });

    } catch (error) {
      console.error('Delete contact message error:', error);

      res.status(500).json({
        message: 'Failed to delete contact message'
      });
    }
  }
);


module.exports = router;