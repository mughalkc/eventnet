const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { sendEmail, sendAbsentNotificationEmail } = require('../utils/emailService');

// All routes require vendor authorization
router.use(protect);
router.use(authorize('vendor'));

/**
 * @route   GET /api/vendor/dashboard
 * @desc    Get vendor dashboard analytics
 * @access  Private (Vendor)
 */
router.get('/dashboard', async (req, res) => {
  try {
    const events = await Event.find({ vendor: req.user._id });
    const eventIds = events.map(e => e._id);

    const totalTickets = await Ticket.countDocuments({ event: { $in: eventIds } });
    const tickets = await Ticket.find({ event: { $in: eventIds } }).populate('event');

    const totalRevenue = tickets.reduce((acc, ticket) => acc + (ticket.price || 0), 0);

    // Active/Upcoming vs Past events
    const now = new Date();
    const activeEvents = events.filter(e => new Date(e.endDate || e.startDate) >= now);
    const pastEvents = events.filter(e => new Date(e.endDate || e.startDate) < now);

    res.json({
      success: true,
      data: {
        totalEvents: events.length,
        activeEvents: activeEvents.length,
        pastEvents: pastEvents.length,
        totalTicketsSold: totalTickets,
        totalRevenue,
        recentTickets: tickets.slice(-10).reverse()
      }
    });
  } catch (error) {
    console.error('Vendor dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching dashboard' });
  }
});

/**
 * @route   GET /api/vendor/events
 * @desc    Get all events created by this vendor
 * @access  Private (Vendor)
 */
router.get('/events', async (req, res) => {
  try {
    const events = await Event.find({ vendor: req.user._id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    console.error('Error fetching vendor events:', error);
    res.status(500).json({ success: false, message: 'Server error fetching events' });
  }
});

/**
 * @route   POST /api/vendor/events
 * @desc    Create a new event
 * @access  Private (Vendor)
 */
router.post('/events', async (req, res) => {
  try {
    req.body.vendor = req.user._id;

    const event = await Event.create(req.body);

    res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error creating event'
    });
  }
});

/**
 * @route   PUT /api/vendor/events/:id
 * @desc    Update an event
 * @access  Private (Vendor)
 */
router.put('/events/:id', async (req, res) => {
  try {
    let event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Make sure user is event owner
    if (event.vendor.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized to update this event' });
    }

    event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(400).json({ success: false, message: error.message || 'Error updating event' });
  }
});

/**
 * @route   DELETE /api/vendor/events/:id
 * @desc    Delete an event
 * @access  Private (Vendor)
 */
router.delete('/events/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Make sure user is event owner
    if (event.vendor.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this event' });
    }

    await event.deleteOne();

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ success: false, message: 'Server error deleting event' });
  }
});

/**
 * @route   GET /api/vendor/events/:id/attendees
 * @desc    Get all attendees for an event
 * @access  Private (Vendor)
 */
router.get('/events/:id/attendees', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.vendor.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const tickets = await Ticket.find({ event: req.params.id }).populate('user', 'name email phone');

    res.json({
      success: true,
      count: tickets.length,
      data: tickets
    });
  } catch (error) {
    console.error('Error fetching attendees:', error);
    res.status(500).json({ success: false, message: 'Server error fetching attendees' });
  }
});

/**
 * @route   POST /api/vendor/events/:id/notify-absent
 * @desc    Notify attendees who missed the event
 * @access  Private (Vendor)
 */
router.post('/events/:id/notify-absent', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.vendor.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized to notify attendees' });
    }

    // Find all tickets that were not checked in / marked as absent
    const absentTickets = await Ticket.find({
      event: req.params.id,
      $or: [{ checkedIn: false }, { status: 'absent' }]
    }).populate('user', 'name email');

    const results = {
      total: absentTickets.length,
      sent: 0,
      failed: 0,
      alerts: []
    };

    for (const ticket of absentTickets) {
      if (ticket.user && ticket.user.email) {
        try {
          const emailRes = await sendAbsentNotificationEmail(
            ticket.user.email,
            ticket.user.name || 'Attendee',
            event
          );

          if (emailRes && emailRes.success) {
            results.sent++;
          } else {
            results.failed++;
            const alertMsg = `[NOTIFICATION ALERT]: Failed to send absent email to ${ticket.user.email}. Fallback recorded.`;
            console.warn(alertMsg);
            results.alerts.push(alertMsg);
          }
        } catch (mailErr) {
          results.failed++;
          console.error(`Failed to send absent email to ${ticket.user.email}:`, mailErr);
          results.alerts.push(`[NOTIFICATION ALERT]: Error sending to ${ticket.user.email}: ${mailErr.message}`);
        }
      }
    }

    res.json({
      success: true,
      message: `Processed absent notifications. Sent: ${results.sent}, Failed: ${results.failed}`,
      data: results
    });
  } catch (error) {
    console.error('Error processing absent notifications:', error);
    res.status(500).json({ success: false, message: 'Server error sending absent notifications' });
  }
});

module.exports = router;