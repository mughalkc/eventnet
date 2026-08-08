const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Revenue = require('../models/Revenue');
const mongoose = require('mongoose');

// Process a payment and create revenue record
router.post('/process', verifyToken, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { eventId, ticketId, quantity, amount, paymentMethod } = req.body;
    const userId = req.user.id;

    // Validate the event exists
    const event = await Event.findById(eventId).session(session);
    if (!event) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Event not found' });
    }

    // Get the vendor ID from the event
    const vendorId = event.createdBy;

    // Generate a unique ticket code
    const generateTicketCode = () => {
      // Generate a random string of 8 characters
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return `${event.name.substring(0, 3).toUpperCase()}-${code}`;
    };
    
    // Create a ticket purchase record
    const ticketPurchase = new Ticket({
      event: eventId,
      user: userId,
      ticketType: ticketId,
      quantity: quantity,
      totalAmount: amount,
      paymentStatus: 'completed',
      ticketCode: generateTicketCode(),
      paymentMethod: 'stripe', // Using 'stripe' as it's one of the allowed enum values
      paymentId: Date.now().toString() // Adding a payment ID
    });

    await ticketPurchase.save({ session });

    // Calculate platform fee (10% of the total amount)
    const platformFee = parseFloat((amount * 0.10).toFixed(2));
    const netAmount = parseFloat((amount - platformFee).toFixed(2));
    
    // Create a revenue record for the vendor
    const revenue = new Revenue({
      vendor: vendorId,
      event: eventId,
      ticket: ticketPurchase._id,
      amount: amount,
      fee: platformFee,
      netAmount: netAmount, // Net amount after platform fee
      status: 'paid',
      paymentMethod: 'stripe',
      paidDate: new Date(),
      transactionId: `txn_${Date.now()}`
    });

    await revenue.save({ session });

    // Add the user to the event's attendees
    if (!event.attendees.includes(userId)) {
      event.attendees.push(userId);
      await event.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    // Send ticket confirmation email
    try {
      // Get user details
      const user = await mongoose.model('User').findById(userId);
      
      // Find the ticket details for the email
      const ticketInfo = event.tickets && event.tickets.find(t => t._id.toString() === ticketId);
      
      // Send ticket confirmation email
      const emailService = require('../utils/emailService');
      await emailService.sendTicketConfirmationEmail(
        user.email,
        user.name,
        event,
        {
          ticketInfo,
          quantity,
          totalAmount: amount,
          ticketCode: ticketPurchase.ticketCode
        }
      );
      
      console.log(`Ticket confirmation email sent to ${user.email} for event ${event.name}`);
      
      // Also notify the vendor/event creator
      const vendorUser = await mongoose.model('User').findById(event.createdBy);
      if (vendorUser) {
        await emailService.sendVendorRegistrationNotification(
          vendorUser.email,
          vendorUser.name,
          event,
          user
        );
        console.log(`Vendor notification sent to ${vendorUser.email} for ticket purchase`);
      }
    } catch (emailError) {
      // Don't fail the payment if email fails
      console.error('Error sending ticket confirmation email:', emailError);
    }

    return res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      paymentId: ticketPurchase._id,
      ticketId: ticketPurchase._id
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Payment processing error:', error);
    return res.status(500).json({ message: 'Error processing payment', error: error.message });
  }
});

// Get payment history for the current user
router.get('/history', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find all ticket purchases for this user
    const tickets = await Ticket.find({ user: userId })
      .populate('event', 'name startDate location')
      .sort({ createdAt: -1 });
    
    return res.status(200).json({
      success: true,
      payments: tickets
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return res.status(500).json({ message: 'Error fetching payment history', error: error.message });
  }
});

module.exports = router;
