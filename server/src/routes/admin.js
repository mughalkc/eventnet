const express = require('express');
const router = express.Router();
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const mongoose = require('mongoose');
const Vendor = require('../models/Vendor');

// Helper function to safely parse 12-hour and 24-hour time strings
const parseTime = (timeStr, defaultH, defaultM) => {
  if (!timeStr) return [defaultH, defaultM];
  const match = String(timeStr).match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!match) return [defaultH, defaultM];
  let h = parseInt(match[1], 10);
  let m = parseInt(match[2], 10);
  const period = match[3];
  if (period) {
    if (period.toUpperCase() === 'PM' && h < 12) h += 12;
    if (period.toUpperCase() === 'AM' && h === 12) h = 0;
  }
  return [h, m];
};

// Admin dashboard statistics
router.get('/dashboard-stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const pendingVendors = await User.countDocuments({ 
      $or: [
        { role: 'vendor', status: 'pending' },
        { 'vendor.status': 'pending' }
      ]
    });
    
    const now = new Date();
    const allEvents = await Event.find({
      status: { $nin: ['draft', 'cancelled', 'completed'] }
    }).lean();

    const activeEvents = allEvents.filter(event => {
      if (!event.startDate) return false;

      const start = new Date(event.startDate);
      const [startH, startM] = parseTime(event.startTime, 0, 0);
      start.setHours(startH, startM, 0, 0);

      const end = event.endDate ? new Date(event.endDate) : new Date(event.startDate);
      let [endH, endM] = parseTime(event.endTime, startH + 2, startM);
      end.setHours(endH, endM, 59, 999);

      return now >= start && now <= end;
    }).length;

        const Revenue = require('../models/Revenue');
        let totalRevenue = 0;
        const revenueAgg = await Revenue.aggregate([
      { $match: { status: { $ne: 'refunded' } } },
      { $group: { _id: null, total: { $sum: '$netAmount' } } }
    ]);
    
    if (revenueAgg.length > 0 && revenueAgg[0].total) {
      totalRevenue = revenueAgg[0].total;
    }
    
    res.json({
      totalUsers,
      pendingVendors,
      activeEvents,
      totalRevenue
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Error fetching dashboard statistics' });
  }
});

// User management routes
router.get('/users', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

router.put('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { role, status } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role, status },
      { new: true }
    ).select('-password');
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user' });
  }
});

router.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user' });
  }
});

// Event management routes (FIXED LIVE STATUS & REVENUE AGGREGATION)
router.get('/events', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const events = await Event.find()
      .populate('createdBy', 'name email')
      .sort('-createdAt')
      .lean();
    
    // Compute total tickets & revenue per event
    const ticketStats = await Ticket.aggregate([
      { $match: { paymentStatus: { $in: ['completed', 'paid'] } } },
      {
        $group: {
          _id: '$event',
          totalRevenue: { $sum: '$totalAmount' },
          totalTickets: { $sum: { $ifNull: ['$quantity', 1] } }
        }
      }
    ]);

    const statsMap = {};
    ticketStats.forEach(stat => {
      if (stat._id) statsMap[stat._id.toString()] = stat;
    });

    const now = new Date();

    const eventsWithLiveStatus = events.map(event => {
      let liveStatus = 'upcoming';

      if (event.startDate) {
        const start = new Date(event.startDate);
        const [startH, startM] = parseTime(event.startTime, 0, 0);
        start.setHours(startH, startM, 0, 0);

        const end = event.endDate ? new Date(event.endDate) : new Date(event.startDate);
        let [endH, endM] = parseTime(event.endTime, startH + 2, startM);
        end.setHours(endH, endM, 59, 999);

        if (now > end) {
          liveStatus = 'expired';
        } else if (now >= start && now <= end) {
          liveStatus = 'ongoing';
        } else {
          liveStatus = 'upcoming';
        }
      }

      const eventStats = statsMap[event._id.toString()] || { totalRevenue: 0, totalTickets: 0 };

      return {
        ...event,
        liveStatus,
        revenue: eventStats.totalRevenue,
        ticketCount: eventStats.totalTickets
      };
    });

    res.json(eventsWithLiveStatus);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'Error fetching events' });
  }
});

router.get('/events/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'name email')
      .lean();
    
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching event details' });
  }
});

router.get('/events/:id/registrations', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('attendees', 'name email')
      .populate('pendingApprovals', 'name email')
      .lean();
    
    if (!event) return res.status(404).json({ message: 'Event not found' });
    
    const registrations = [];
    if (event.attendees && event.attendees.length > 0) {
      event.attendees.forEach(user => {
        registrations.push({
          _id: user._id,
          event: event._id,
          user: user,
          status: 'confirmed',
          paymentAmount: event.price || 0,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt
        });
      });
    }
    
    if (event.pendingApprovals && event.pendingApprovals.length > 0) {
      event.pendingApprovals.forEach(user => {
        registrations.push({
          _id: user._id,
          event: event._id,
          user: user,
          status: 'pending',
          paymentAmount: event.price || 0,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt
        });
      });
    }
    
    if (registrations.length === 0) {
      const tickets = await Ticket.find({ event: req.params.id })
        .populate('user', 'name email')
        .sort('-createdAt')
        .lean();
      
      tickets.forEach(ticket => {
        registrations.push({
          _id: ticket._id,
          event: ticket.event,
          user: ticket.user,
          status: ticket.paymentStatus || 'completed',
          paymentAmount: ticket.totalAmount,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt
        });
      });
    }
    
    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching event registrations' });
  }
});

router.get('/events/:id/insights', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    if (!event) return res.status(404).json({ message: 'Event not found' });
    
    const confirmedAttendees = event.attendees?.length || 0;
    const pendingAttendees = event.pendingApprovals?.length || 0;
    
    const tickets = await Ticket.find({ event: req.params.id }).lean();
    const confirmedTickets = tickets.filter(ticket => ticket.paymentStatus === 'completed');
    
    const totalAttendees = confirmedAttendees + confirmedTickets.length;
    let totalRevenue = 0;
    
    if (confirmedAttendees > 0 && event.price) {
      totalRevenue += confirmedAttendees * event.price;
    }
    
    if (confirmedTickets.length > 0) {
      totalRevenue += confirmedTickets.reduce((sum, ticket) => sum + (ticket.totalAmount || 0), 0);
    }
    
    res.json({
      views: event.views || 0,
      registrations: totalAttendees + pendingAttendees,
      confirmedRegistrations: totalAttendees,
      revenue: totalRevenue
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching event insights' });
  }
});

router.put('/events/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('createdBy', 'name email');
    
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: 'Error updating event' });
  }
});

router.delete('/events/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await Registration.deleteMany({ event: req.params.id });
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting event' });
  }
});

// Vendor management routes
router.get('/vendors', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [userVendors, vendorVendors] = await Promise.all([
      User.find({ role: 'vendor' }).select('-password').sort('-createdAt'),
      Vendor.find().select('-password').sort('-createdAt')
    ]);

    const allVendors = [...userVendors, ...vendorVendors];
    const uniqueVendors = allVendors.reduce((acc, vendor) => {
      const key = vendor._id.toString();
      if (!acc[key]) acc[key] = vendor;
      return acc;
    }, {});

    res.json(Object.values(uniqueVendors));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vendors' });
  }
});

router.put('/vendors/:id/status', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const [user, vendor] = await Promise.all([
      User.findOneAndUpdate({ _id: req.params.id, role: 'vendor' }, { status }, { new: true }).select('-password'),
      Vendor.findOneAndUpdate(
        { $or: [{ _id: req.params.id }, { contactEmail: (await User.findById(req.params.id).select('email').lean())?.email }] },
        { status },
        { new: true }
      )
    ]);
    
    if (!user && !vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json(user || vendor);
  } catch (error) {
    res.status(500).json({ message: 'Error updating vendor status' });
  }
});

router.get('/vendors/pending', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [userVendors, vendorVendors] = await Promise.all([
      User.find({ role: 'vendor', status: 'pending' }).select('-password').sort('-createdAt'),
      Vendor.find({ status: 'pending' }).select('-password').sort('-createdAt')
    ]);

    const allVendors = [...userVendors, ...vendorVendors];
    const uniqueVendors = allVendors.reduce((acc, vendor) => {
      const key = vendor._id.toString();
      if (!acc[key]) acc[key] = vendor;
      return acc;
    }, {});

    res.json(Object.values(uniqueVendors));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pending vendors' });
  }
});

router.get('/vendors/approved', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const vendors = await User.find({ role: 'vendor', status: 'approved' }).select('-password').sort('-createdAt');
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching approved vendors' });
  }
});

router.post('/vendors/event-counts', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { vendorIds } = req.body;
    if (!Array.isArray(vendorIds)) return res.json({});
    
    const counts = await Event.aggregate([
      { 
        $match: { 
          createdBy: { 
            $in: vendorIds.map(id => typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id) 
          } 
        } 
      },
      { 
        $group: { 
          _id: '$createdBy', 
          count: { $sum: 1 } 
        } 
      }
    ]);
    
    const result = {};
    counts.forEach(c => { result[c._id.toString()] = c.count; });
    res.json(result);
  } catch (error) {
    res.status(500).json({});
  }
});

// Ticket management routes
router.get('/tickets', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const ticketsFromModel = await Ticket.find({}).lean();
    let allTickets = [];
    
    if (ticketsFromModel.length > 0) {
      for (const ticket of ticketsFromModel) {
        try {
          let eventData = null;
          if (ticket.event) {
            const event = await Event.findById(ticket.event).lean();
            if (event) {
              eventData = { _id: event._id, name: event.name, startDate: event.startDate, location: event.location };
            }
          }
          
          let userData = null;
          if (ticket.user) {
            const user = await User.findById(ticket.user).lean();
            if (user) {
              userData = { _id: user._id, name: user.name, email: user.email };
            }
          }
          
          allTickets.push({
            _id: ticket._id,
            ticketId: ticket.ticketCode || ticket._id.toString().substring(0, 8).toUpperCase(),
            event: eventData,
            user: userData,
            quantity: ticket.quantity || 1,
            price: ticket.totalAmount,
            status: ticket.paymentStatus || 'completed',
            createdAt: ticket.createdAt,
            paymentMethod: ticket.paymentMethod
          });
        } catch (err) {
          console.error('Error processing ticket:', err);
        }
      }
    }
    
    res.json(allTickets);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tickets' });
  }
});

// Recent activities endpoint
router.get('/recent-activities', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const [recentUsers, recentVendors, recentEvents, recentTickets] = await Promise.all([
      User.find({ role: 'user' }).sort({ createdAt: -1 }).limit(limit).select('name email createdAt').lean(),
      User.find({ role: 'vendor' }).sort({ updatedAt: -1 }).limit(limit).select('name email status businessName createdAt updatedAt').lean(),
      Event.find({}).sort({ createdAt: -1 }).limit(limit).select('name createdBy startDate createdAt').populate('createdBy', 'name').lean(),
      Ticket.find({}).sort({ createdAt: -1 }).limit(limit).select('event user totalAmount paymentStatus createdAt').populate('event', 'name').populate('user', 'name email').lean()
    ]);
    
    const userActivities = recentUsers.map(user => ({
      id: user._id,
      type: 'user_registration',
      user: user.name,
      email: user.email,
      timestamp: user.createdAt,
      details: 'Registered a new account'
    }));
    
    const vendorActivities = recentVendors.map(vendor => ({
      id: vendor._id,
      type: vendor.status === 'pending' ? 'vendor_registration' : 'vendor_' + vendor.status,
      user: vendor.businessName || vendor.name,
      email: vendor.email,
      timestamp: vendor.updatedAt || vendor.createdAt,
      details: `Vendor ${vendor.status === 'pending' ? 'registered' : 'was ' + vendor.status}`
    }));
    
    const eventActivities = recentEvents.map(event => ({
      id: event._id,
      type: 'new_event',
      user: event.createdBy?.name || 'Unknown',
      title: event.name,
      timestamp: event.createdAt,
      details: `Created event: ${event.name}`
    }));
    
    const ticketActivities = recentTickets.map(ticket => ({
      id: ticket._id,
      type: 'payment',
      user: ticket.user?.name || 'Unknown',
      amount: ticket.totalAmount,
      eventName: ticket.event?.name || 'Unknown Event',
      timestamp: ticket.createdAt,
      status: ticket.paymentStatus,
      details: `Purchased ticket for ${ticket.event?.name || 'an event'}`
    }));
    
    let allActivities = [...userActivities, ...vendorActivities, ...eventActivities, ...ticketActivities];
    allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    allActivities = allActivities.slice(0, limit);
    
    res.json(allActivities);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching recent activities' });
  }
});

module.exports = router;