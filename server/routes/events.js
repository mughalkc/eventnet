const express = require('express')
const router = express.Router()
const { auth } = require('../src/middleware/auth')
const Event = require('../src/models/Event')
const User = require('../src/models/User')

// Helper: figure out if an event is upcoming, ongoing, or expired
// based on its startDate/endDate (and startTime/endTime if present)
function getLiveStatus(event) {
  const now = new Date()

  // Combine date + time into real Date objects for accurate comparison
  const start = new Date(event.startDate)
  const end = new Date(event.endDate)

  if (event.startTime) {
    const [sh, sm] = event.startTime.split(':')
    start.setHours(parseInt(sh) || 0, parseInt(sm) || 0, 0, 0)
  }
  if (event.endTime) {
    const [eh, em] = event.endTime.split(':')
    end.setHours(parseInt(eh) || 23, parseInt(em) || 59, 0, 0)
  } else {
    end.setHours(23, 59, 59, 999)
  }

  if (now > end) return 'expired'
  if (now >= start && now <= end) return 'ongoing'
  return 'upcoming'
}

// Helper: attach liveStatus to an event document (works for arrays or single doc)
function withLiveStatus(eventDoc) {
  const obj = eventDoc.toObject ? eventDoc.toObject() : eventDoc
  obj.liveStatus = getLiveStatus(obj)
  return obj
}

// Get all events
router.get('/', async (req, res) => {
  try {
    const events = await Event.find()
      .populate('createdBy', 'name email avatar')
      .sort({ createdAt: -1 })
    res.json(events.map(withLiveStatus))
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// Get events created by a user
router.get('/user/:userId', auth, async (req, res) => {
  try {
    // Verify the requesting user is the same as the userId in the URL
    if (req.user.id !== req.params.userId) {
      return res.status(403).json({ message: 'Not authorized to view these events' })
    }

    const events = await Event.find({ createdBy: req.params.userId })
      .populate('createdBy', 'name email avatar')
      .sort({ createdAt: -1 })
    
    res.json(events)
  } catch (error) {
    console.error('Error fetching user events:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get events created by vendor
router.get('/vendor', auth, async (req, res) => {
  try {
    // Verify the requesting user is a vendor
    if (req.user.role !== 'vendor' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view these events' })
    }

    const events = await Event.find({ createdBy: req.user.id })
      .populate('createdBy', 'name email avatar')
      .populate('attendees', 'name email avatar')
      .sort({ createdAt: -1 })
    
    res.json(events.map(withLiveStatus))
  } catch (error) {
    console.error('Error fetching vendor events:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get event by ID
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'name email avatar')
      .populate('attendees', 'name email avatar')
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    res.json(withLiveStatus(event))
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// Create event
router.post('/', auth, async (req, res) => {
  try {
    const newEvent = new Event({
      ...req.body,
      createdBy: req.user.id,
      hostName: req.user.name,
      hostEmail: req.user.email,
      hostAvatar: req.user.avatar
    })

    const event = await newEvent.save()
    res.status(201).json(event)
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// Register for event
router.post('/:id/register', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    // Check if user is already registered
    if (event.attendees.includes(req.user.id)) {
      return res.status(400).json({ message: 'Already registered for this event' })
    }

    // Block registration if the event has already ended
    if (getLiveStatus(event) === 'expired') {
      return res.status(400).json({ message: 'This event has already ended and is no longer accepting registrations' })
    }

    // Check capacity if limited
    if (event.capacity === 'limited' && event.attendees.length >= event.maxCapacity) {
      return res.status(400).json({ message: 'Event is at full capacity' })
    }

    // Add user to attendees
    event.attendees.push(req.user.id)
    event.checkIns.push({ user: req.user.id })
    await event.save()

    res.json({ message: 'Successfully registered for event' })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// Check in an attendee (called by vendor's QR scanner)
router.post('/:id/checkin/:userId', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)

    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    // Only the event creator (vendor) or admin can check in attendees
    if (event.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized to check in attendees for this event' })
    }

    // Confirm this user is actually registered for the event
    const isAttendee = event.attendees.some(a => a.toString() === req.params.userId)
    if (!isAttendee) {
      return res.status(400).json({ message: 'This user is not registered for this event' })
    }

    let entry = event.checkIns.find(c => c.user.toString() === req.params.userId)
    if (!entry) {
      // Backfill in case the attendee registered before checkIns existed
      event.checkIns.push({ user: req.params.userId })
      entry = event.checkIns[event.checkIns.length - 1]
    }

    if (entry.checkedIn) {
      return res.status(400).json({ message: 'This attendee has already been checked in' })
    }

    entry.checkedIn = true
    entry.checkedInAt = new Date()
    await event.save()

    res.json({ message: 'Attendee checked in successfully' })
  } catch (error) {
    console.error('Check-in error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Self check-in by attendee (with optional GPS verification)
// POST /api/events/:id/self-checkin
// Body: { latitude?, longitude? }
router.post('/:id/self-checkin', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
    if (!event) return res.status(404).json({ message: 'Event not found' })

    // Must be registered
    const isAttendee = event.attendees.some(a => a.toString() === req.user.id)
    if (!isAttendee) {
      return res.status(400).json({ message: 'You are not registered for this event' })
    }

    // Must be during event time (ongoing check)
    if (getLiveStatus(event) !== 'ongoing') {
      return res.status(400).json({
        message: getLiveStatus(event) === 'upcoming'
          ? 'Event has not started yet. Attendance opens when the event begins.'
          : 'Event has already ended. Attendance is closed.'
      })
    }

    // GPS check — only if event has coordinates AND user sent their location
    const { latitude, longitude } = req.body
    const eventLat = event.location?.coordinates?.lat
    const eventLng = event.location?.coordinates?.lng

    if (eventLat && eventLng && latitude && longitude) {
      // Haversine formula — calculate distance in km between two GPS points
      const R = 6371
      const dLat = ((latitude - eventLat) * Math.PI) / 180
      const dLon = ((longitude - eventLng) * Math.PI) / 180
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((eventLat * Math.PI) / 180) *
          Math.cos((latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2)
      const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

      // Allow within 500 metres (0.5 km)
      if (distance > 0.5) {
        return res.status(400).json({
          message: `You appear to be ${(distance * 1000).toFixed(0)} metres away from the event venue. Please be at the venue to mark attendance.`,
          tooFar: true,
          distanceMetres: Math.round(distance * 1000)
        })
      }
    }

    // Mark as checked in
    let entry = event.checkIns.find(c => c.user.toString() === req.user.id)
    if (!entry) {
      event.checkIns.push({ user: req.user.id })
      entry = event.checkIns[event.checkIns.length - 1]
    }

    if (entry.checkedIn) {
      return res.status(400).json({ message: 'You have already marked your attendance.' })
    }

    entry.checkedIn = true
    entry.checkedInAt = new Date()
    await event.save()

    res.json({ message: 'Attendance marked successfully! Welcome to the event.' })
  } catch (error) {
    console.error('Self check-in error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Unregister from event
router.delete('/:id/register', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    // Remove user from attendees
    event.attendees = event.attendees.filter(
      attendee => attendee.toString() !== req.user.id
    )
    await event.save()

    res.json({ message: 'Successfully unregistered from event' })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// Update event
router.put('/:id', auth, async (req, res) => {
  try {
    let event = await Event.findById(req.params.id)
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    // Check if user is the creator
    if (event.createdBy.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' })
    }

    event = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    )

    res.json(event)
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// Delete event
router.delete('/:id', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    // Check if user is the creator
    if (event.createdBy.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' })
    }

    await Event.findByIdAndDelete(req.params.id)
    res.json({ message: 'Event removed' })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// Get event attendees
router.get('/:id/attendees', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('attendees', 'name email avatar')
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    res.json(event.attendees)
  } catch (error) {
    console.error('Error fetching attendees:', error);
    res.status(500).json({ message: 'Server error' })
  }
})



module.exports = router