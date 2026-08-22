const express = require('express')
const Event = require('../models/Event')
const User = require('../models/User')
const { verifyToken } = require('../middleware/auth')
const { sendEventNotification } = require('../utils/notifications')
const upload = require('../middleware/upload')

const router = express.Router()

// Helper: compute live status from event dates safely
function getLiveStatus(event) {
  const now = new Date();
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);

  if (event.startTime) {
    const [sh, sm] = event.startTime.split(':');
    start.setHours(parseInt(sh) || 0, parseInt(sm) || 0, 0, 0);
  }
  if (event.endTime) {
    const [eh, em] = event.endTime.split(':');
    end.setHours(parseInt(eh) || 23, parseInt(em) || 59, 0, 0);
  } else {
    end.setHours(23, 59, 59, 999);
  }

  if (now.getTime() > end.getTime()) return 'expired';
  if (now.getTime() >= start.getTime() && now.getTime() <= end.getTime()) return 'ongoing';
  return 'upcoming';
}

// Create event
router.post('/', verifyToken, upload.single('image'), async (req, res) => {
  try {
    const {
      name,
      startDate,
      startTime,
      endDate,
      endTime,
      location,
      description,
      theme,
      isPublic,
      requireApproval,
      capacity,
      maxCapacity
    } = req.body

    console.log('Received event data:', {
      name,
      startDate,
      startTime,
      endDate,
      endTime,
      location,
      description,
      theme,
      isPublic,
      requireApproval,
      capacity,
      maxCapacity
    })

    // Validate required fields
    if (!name || !startDate || !startTime || !endDate || !endTime || !location || !theme) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    // Combine date and time
    const startDateTime = new Date(`${startDate}T${startTime}`)
    const endDateTime = new Date(`${endDate}T${endTime}`)

    // Validate dates
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return res.status(400).json({ message: 'Invalid date or time format' })
    }

    if (startDateTime >= endDateTime) {
      return res.status(400).json({ message: 'End date must be after start date' })
    }

    // Validate capacity settings
    if (capacity === 'limited' && (!maxCapacity || maxCapacity < 1)) {
      return res.status(400).json({ message: 'Max capacity is required and must be greater than 0' })
    }

    const event = new Event({
      name,
      startDate: startDateTime,
      endDate: endDateTime,
      location,
      description,
      theme,
      isPublic: isPublic !== undefined ? isPublic : true, // default public
      requireApproval,
      capacity,
      maxCapacity: capacity === 'limited' ? maxCapacity : null,
      createdBy: req.user.id,
      createdByModel: req.user.role === 'vendor' ? 'Vendor' : 'User',
      image: req.file ? `/uploads/events/${req.file.filename}` : null
    })

    console.log('Creating event with data:', event)

    await event.save()
    res.status(201).json({ eventId: event._id })
  } catch (error) {
    console.error('Create event error:', error)
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message })
    }
    res.status(500).json({ message: 'Failed to create event', error: error.message })
  }
})

// Get all events
router.get('/', async (req, res) => {
  try {
    const events = await Event.find()
      .populate('createdBy', 'name email')
      .sort({ startDate: 1 })
    res.json(events)
  } catch (error) {
    console.error('Get events error:', error)
    res.status(500).json({ message: 'Failed to fetch events' })
  }
})


// One-time fix: make all existing events public — call once from browser
router.get('/fix-public', async (req, res) => {
  try {
    const result = await Event.updateMany(
      { isPublic: { $ne: true } },
      { $set: { isPublic: true } }
    )
    res.json({ message: `Done! Fixed ${result.modifiedCount} events — all set to public.` })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

//(SHOW EXPIRED TILL NEXT DAY)

router.get('/public', async (req, res) => {
  try {
    console.log('Fetching public events...');

    // Yesterday midnight tak ke events layen (Expired events stay visible until tomorrow)
    const startOfYesterday = new Date();
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    startOfYesterday.setHours(0, 0, 0, 0);

    const events = await Event.find({
      isPublic: true,
      endDate: { $gte: startOfYesterday }
    })
    .populate('createdBy', 'name email businessName')
    .populate('attendees', 'name email');

    const transformedEvents = events.map(event => {
      const eventObj = event.toObject();
      
      let imageUrl = null;
      if (eventObj.image) {
        const imagePath = eventObj.image.replace(/^\//, '');
        imageUrl = `https://eventnet-production.up.railway.app/uploads/events/${imagePath.replace('uploads/events/', '')}`;
      }
      
      return {
        _id: eventObj._id,
        name: eventObj.name || 'Untitled Event',
        description: eventObj.description || '',
        location: eventObj.location || 'Location not specified',
        image: imageUrl || 'https://via.placeholder.com/300x200?text=Event+Image',
        startDate: eventObj.startDate,
        endDate: eventObj.endDate,
        startTime: eventObj.startTime,
        endTime: eventObj.endTime,
        status: eventObj.status || 'upcoming',
        liveStatus: getLiveStatus(eventObj),
        capacity: eventObj.capacity,
        maxCapacity: eventObj.maxCapacity,
        createdBy: {
          _id: eventObj.createdBy?._id || 'unknown',
          name: eventObj.createdBy?.businessName || eventObj.createdBy?.name || 'Unknown Creator',
          email: eventObj.createdBy?.email || '',
          type: eventObj.createdByModel || 'Unknown'
        },
        attendees: Array.isArray(eventObj.attendees) ? eventObj.attendees.map(attendee => ({
          _id: (attendee._id || attendee).toString(),
          name: attendee.name || 'Unknown User',
          email: attendee.email || ''
        })) : []
      };
    });

    res.json(transformedEvents);
  } catch (error) {
    console.error('Error fetching public events:', error);
    res.status(500).json({ message: 'Failed to fetch events' });
  }
});

// Get user's registered events
router.get('/user/registered', verifyToken, async (req, res) => {
  try {
    const events = await Event.find({
      attendees: req.user.id
    })
    .populate('createdBy', 'name email avatar')
    .sort({ startDate: 1 });
    
    const transformedEvents = events.map(event => {
      const eventObj = event.toObject();
      return {
        ...eventObj,
        liveStatus: getLiveStatus(eventObj),
        image: eventObj.image 
          ? `https://eventnet-production.up.railway.app/${eventObj.image.replace(/^\//, '')}` 
          : 'https://via.placeholder.com/400x200?text=Event+Image'
      };
    });
    
    res.json(transformedEvents);
  } catch (error) {
    console.error('Get user events error:', error);
    res.status(500).json({ message: 'Error fetching user events' });
  }
});

// Search events
router.get('/search', async (req, res) => {
  try {
    const { query, category, date } = req.query
    const filter = { 
      isPublic: true,
      status: 'published',
      endDate: { $gte: new Date() }
    }

    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { location: { $regex: query, $options: 'i' } }
      ]
    }

    if (category) {
      filter.category = category
    }

    if (date) {
      // Handle date filtering
      const targetDate = new Date(date)
      filter.startDate = { $lte: targetDate }
      filter.endDate = { $gte: targetDate }
    }

    const events = await Event.find(filter)
      .populate('createdBy', 'name email')
      .sort({ startDate: 1 })
    
    res.json(events)
  } catch (error) {
    console.error('Search events error:', error)
    res.status(500).json({ message: 'Error searching events' })
  }
})

// Get all events for a vendor
router.get('/vendor', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    // Only fetch events created by this vendor using Vendor model
    const events = await Event.find({ createdBy: req.user.id, createdByModel: 'Vendor' })
      .populate({ path: 'attendees', select: 'name email avatar', model: 'User' })
      .populate({ path: 'createdBy', select: 'businessName contactEmail', model: 'Vendor' });
    res.json(events);
  } catch (error) {
    console.error('Error fetching vendor events:', error);
    res.status(500).json({ message: 'Error fetching vendor events', error: error.message });
  }
});

// Get single event - This must come AFTER all other GET routes with specific paths
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('attendees', 'name email')

    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    res.json(event)
  } catch (error) {
    console.error('Get event error:', error)
    res.status(500).json({ message: 'Failed to fetch event' })
  }
})

// Update event
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)

    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    const vendorId = (req.user.id || req.user.vendorId || '').toString()
    const eventCreator = event.createdBy.toString()

    if (eventCreator !== vendorId) {
      return res.status(403).json({ message: 'Not authorized to update this event' })
    }

    // Clear attendees and checkIns — fresh start after update
    const { attendees, checkIns, _id, __v, createdAt, ...updateData } = req.body

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { 
        ...updateData,
        attendees: [],
        checkIns: [],
        status: 'upcoming'
      },
      { new: true }
    )

    res.json(updatedEvent)
  } catch (error) {
    console.error('Update event error:', error)
    res.status(500).json({ message: 'Failed to update event' })
  }
})

// Delete event
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)

    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    if (event.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this event' })
    }

    await event.remove()
    res.json({ message: 'Event deleted successfully' })
  } catch (error) {
    console.error('Delete event error:', error)
    res.status(500).json({ message: 'Failed to delete event' })
  }
})

// Register for event
router.post('/:id/register', verifyToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('attendees', 'name email')

    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    if (!event.isPublic) {
      return res.status(403).json({ message: 'This event is not public' })
    }

    if (getLiveStatus(event) === 'expired') {
      return res.status(400).json({ message: 'This event has ended and is no longer accepting registrations.' });
    }
// BLOCK REGISTRATION IF EXPIRED
    if (event.attendees.some(attendee => attendee._id.toString() === req.user.id)) {
      return res.status(400).json({ message: 'Already registered for this event' })
    }

    if (event.capacity === 'limited' && event.attendees.length >= event.maxCapacity) {
      return res.status(400).json({ message: 'Event is full' })
    }

    if (event.requireApproval) {
      event.pendingApprovals.push(req.user.id)
      await event.save()
      return res.json({ 
        message: 'Registration request sent. Waiting for approval.',
        status: 'pending'
      })
    }

    event.attendees.push(req.user.id)
    await event.save()

    try {
      // Get full user details for emails
      const user = await User.findById(req.user.id);
      
      // Send notification email to the user
      await sendEventNotification(event, req.user.id, 'registration', user)
      
      // Send notification email to the vendor/event creator
      const emailService = require('../utils/emailService');
      const vendorEmail = event.createdBy.email;
      const vendorName = event.createdBy.name || 'Event Organizer';
      
      if (vendorEmail) {
        await emailService.sendVendorRegistrationNotification(
          vendorEmail,
          vendorName,
          event,
          user
        );
        console.log(`Vendor notification sent to ${vendorEmail} for event ${event.name}`);
      }
    } catch (emailError) {
      // Don't fail the registration if email fails
      console.error('Error sending registration emails:', emailError);
    }

    res.json({ 
      message: 'Successfully registered for event',
      status: 'registered'
    })
  } catch (error) {
    console.error('Register for event error:', error)
    res.status(500).json({ message: 'Error registering for event' })
  }
})

// Cancel registration
router.post('/:id/cancel', verifyToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('attendees', 'name email')

    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    let userIdToRemove = req.user.id;
    // If vendor, allow removing any user
    if (req.user.role === 'vendor' && req.body.userId) {
      userIdToRemove = req.body.userId;
    }

    const attendeeIndex = event.attendees.findIndex(
      attendee => attendee._id.toString() === userIdToRemove
    )

    if (attendeeIndex === -1) {
      return res.status(400).json({ message: 'Not registered for this event' })
    }

    event.attendees.splice(attendeeIndex, 1)
    await event.save()

    res.json({ message: 'Successfully cancelled registration' })
  } catch (error) {
    console.error('Cancel registration error:', error)
    res.status(500).json({ message: 'Error cancelling registration' })
  }
})

// Get event registrations (attendees)
router.get('/:id/registrations', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('attendees', 'name email avatar')
      .populate('pendingApprovals', 'name email avatar');

    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Get all users (attendees and pending approvals)
    const allUsers = [...event.attendees, ...event.pendingApprovals];
    const userIds = allUsers.map(user => user._id.toString());

    // Fetch all user details in one query
    const users = await User.find({ _id: { $in: userIds } })
      .select('name email avatar');

    // Create registration objects with status
    const registrations = users.map(user => ({
      _id: `${event._id}-${user._id}`,
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      userAvatar: user.avatar,
      eventId: event._id,
      eventTitle: event.name,
      eventDate: event.startDate,
      createdAt: event.createdAt,
      status: event.attendees.some(u => u._id.toString() === user._id.toString()) 
        ? 'approved' 
        : 'pending'
    }));

    res.json(registrations);
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({ message: 'Error fetching registrations' });
  }
});

// Update registration status
router.put('/:id/registrations/:userId/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const event = await Event.findById(req.params.id);

    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Check if user is in pending approvals
    const userIndex = event.pendingApprovals.findIndex(
      u => u.toString() === req.params.userId
    );

    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found in pending approvals' });
    }

    // Remove from pending approvals
    event.pendingApprovals.splice(userIndex, 1);

    if (status === 'approved') {
      // Add to attendees
      event.attendees.push(req.params.userId);
    }

    await event.save();
    res.json({ message: 'Registration status updated successfully' });
  } catch (error) {
    console.error('Error updating registration status:', error);
    res.status(500).json({ message: 'Error updating registration status' });
  }
});

// Remove user from event (unregister)
router.delete('/:id/registrations/:userId', verifyToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Remove from attendees
    event.attendees = event.attendees.filter(
      u => u.toString() !== req.params.userId
    );

    // Remove from pending approvals
    event.pendingApprovals = event.pendingApprovals.filter(
      u => u.toString() !== req.params.userId
    );

    await event.save();
    res.json({ message: 'User unregistered successfully' });
  } catch (error) {
    console.error('Error unregistering user:', error);
    res.status(500).json({ message: 'Error unregistering user' });
  }
});

// Get event insights (simple example)
router.get('/:id/insights', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({
      totalRegistrations: event.attendees.length,
      // Add more insights as needed
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching insights' });
  }
});

// Get event guests (attendees)
router.get('/:id/guests', async (req, res) => {
  try {
    console.log(`Fetching guests for event ID: ${req.params.id}`);
    
    const event = await Event.findById(req.params.id)
      .populate('attendees', 'name email avatar')
      .select('attendees');

    if (!event) {
      console.log(`Event not found: ${req.params.id}`);
      return res.status(404).json({ message: 'Event not found' });
    }

    console.log(`Found event: ${req.params.id}, Attendees:`, event.attendees);
    
    // If attendees is not populated or is empty, try to fetch the event with full details
    if (!event.attendees || event.attendees.length === 0) {
      console.log(`No attendees found in event ${req.params.id}, fetching full event details`);
      
      const fullEvent = await Event.findById(req.params.id);
      console.log(`Full event details:`, fullEvent);
      
      if (fullEvent && fullEvent.attendees && fullEvent.attendees.length > 0) {
        // Manually populate attendees
        const attendeeIds = fullEvent.attendees;
        const attendees = await User.find({ _id: { $in: attendeeIds } })
          .select('name email avatar');
        
        console.log(`Manually populated attendees:`, attendees);
        res.json(attendees || []);
        return;
      }
    }

    res.json(event.attendees || []);
  } catch (error) {
    console.error('Error fetching guests:', error);
    res.status(500).json({ message: 'Error fetching guests' });
  }
});

module.exports = router