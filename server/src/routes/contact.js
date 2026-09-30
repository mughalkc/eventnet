
const express = require('express');
const router = express.Router();

const ContactMessage = require('../models/ContactMessage');
const { verifyToken, verifyAdmin, verifyVendor } = require('../middleware/auth');
const emailService = require('../utils/emailService');
const User = require('../models/User');

router.post('/', async (req, res) => {
  try {
       const { name, email, message, targetAdminId } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        message: 'All fields are required'
      });
    }

   

   // Optional: vendor chose one specific admin
    let targetAdmin = null;
    let notifyEmail = process.env.EMAIL_USER;

    if (targetAdminId) {
      const admin = await User.findOne({ _id: targetAdminId, role: 'admin' });

      if (!admin) {
        return res.status(400).json({ message: 'Selected admin not found' });
      }

      targetAdmin = admin._id;
      notifyEmail = admin.email;
    }
 // Save message permanently in MongoDB
    const contactMessage = await ContactMessage.create({
      name,
      email,
      message,
      targetAdmin
    });

    // Send email notification
    // This keeps your existing email/Resend functionality.
    // Even if email sending fails, the database message remains
    // safely stored.

    try {
      await emailService.sendEmail({
        to: notifyEmail,
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

// Admin list for the vendor's "Send To" dropdown
router.get('/admins', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'vendor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const admins = await User.find({ role: 'admin' })
      .select('name email')
      .sort({ name: 1 });

    res.json(admins);
  } catch (error) {
    console.error('Fetch admins error:', error);
    res.status(500).json({ message: 'Failed to fetch admins' });
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
       // Admin sees: messages for everyone + messages sent only to him
      // Vendor sees: only messages for everyone (not private vendor->admin ones)
      const filter =
        req.user.role === 'admin'
          ? { $or: [{ targetAdmin: null }, { targetAdmin: req.user._id }] }
          : { targetAdmin: null };
      // Get newest messages first
      const messages = await ContactMessage.find(filter)
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

// Admin + Vendor can reply to ONE specific Contact Us message.
// Email goes ONLY to the email saved in that message (taken from DB,
// not from the frontend), so it can never reach anyone else.
router.post('/:id/reply', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'vendor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { replyText } = req.body;

    if (!replyText || !replyText.trim()) {
      return res.status(400).json({ message: 'Reply message is required' });
    }

    const contactMessage = await ContactMessage.findById(req.params.id);

    if (!contactMessage) {
      return res.status(404).json({ message: 'Contact message not found' });
    }

    const escapeHtml = (text) =>
      String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const result = await emailService.sendEmail({
      to: contactMessage.email,
      subject: 'Reply to your message - EventNet',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2>Hello ${escapeHtml(contactMessage.name)},</h2>
          <p style="white-space: pre-wrap;">${escapeHtml(replyText.trim())}</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;" />
          <p style="color: #6b7280; font-size: 13px;"><strong>Your message:</strong></p>
          <p style="color: #6b7280; font-size: 13px; white-space: pre-wrap;">${escapeHtml(contactMessage.message)}</p>
        </div>
      `
    });

    // sendEmail returns success:false when both Resend and Gmail fail
    if (!result || result.success !== true) {
      return res.status(500).json({ message: 'Email could not be sent' });
    }

    res.json({ message: 'Reply sent successfully' });
  } catch (error) {
    console.error('Reply contact message error:', error);
    res.status(500).json({ message: 'Failed to send reply' });
  }
});




module.exports = router;