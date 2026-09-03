const express = require('express');
const router = express.Router();
const Vendor = require('../models/Vendor');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const { verifyToken, verifyVendor } = require('../middleware/auth');
const Event = require('../models/Event');
const User = require('../models/User');
const emailService = require('../utils/emailService');
const bcrypt = require('bcryptjs');

// Helper: figure out if an event is upcoming, ongoing, or expired
// based on its startDate/endDate (and startTime/endTime if present)
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

  if (now > end) return 'expired';
  if (now >= start && now <= end) return 'ongoing';
  return 'upcoming';
}

function withLiveStatus(eventDoc) {
  const obj = eventDoc.toObject ? eventDoc.toObject() : eventDoc;
  obj.liveStatus = getLiveStatus(obj);
  return obj;
}

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/portfolio/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Set up multer for profile photo uploads
const profileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const fs = require('fs');
    const dir = 'uploads/profiles';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const profileUpload = multer({ storage: profileStorage });

// Set up multer for event image uploads
const eventImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/events/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'event-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const eventUpload = multer({
  storage: eventImageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  }
});

// Vendor registration route
router.post('/register', upload.array('portfolio'), async (req, res) => {
  try {
    const {
      businessName,
      services,
      description,
      contactEmail,
      contactPhone,
      password,
      socialLinks
    } = req.body;

    const [existingUser, existingVendor] = await Promise.all([
      User.findOne({ email: contactEmail }),
      Vendor.findOne({ contactEmail })
    ]);

    if (existingUser || existingVendor) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    let portfolio = [];
    if (req.files && req.files.length > 0) {
      portfolio = req.files.map(file => file.path);
    }

    let parsedSocialLinks = {};
    try {
      parsedSocialLinks = typeof socialLinks === 'string' ? JSON.parse(socialLinks) : socialLinks;
    } catch (e) {
      parsedSocialLinks = {};
    }

    const [user, vendor] = await Promise.all([
      new User({
        name: businessName,
        email: contactEmail,
        password,
        role: 'vendor',
        status: 'pending',
        businessName,
        contactEmail,
        phoneNumber: contactPhone
      }).save(),
      new Vendor({
        businessName,
        services: Array.isArray(services) ? services : [services],
        description,
        contactEmail,
        contactPhone,
        password,
        portfolio,
        socialLinks: parsedSocialLinks,
        status: 'pending'
      }).save()
    ]);

    res.status(201).json({ 
      message: 'Vendor registration submitted. Awaiting admin approval.',
      vendor: {
        id: vendor._id,
        businessName: vendor.businessName,
        email: vendor.contactEmail,
        status: vendor.status
      }
    });
  } catch (error) {
    console.error('Vendor registration error:', error);
    res.status(500).json({ message: 'Failed to register vendor.' });
  }
});

// Vendor login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Vendor login attempt for email:', email);

    const [user, vendor] = await Promise.all([
      User.findOne({ email, role: 'vendor' }),
      Vendor.findOne({ contactEmail: email })
    ]);

    if (!user && !vendor) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    let isMatch = false;
    let authModel = null;

    if (vendor) {
      try {
        isMatch = await vendor.comparePassword(password);
        if (isMatch) {
          authModel = vendor;
          console.log('Authenticated with vendor model');
        }
      } catch (error) {
        console.error('Error comparing password with vendor model:', error);
      }
    }

    if (!isMatch && user) {
      try {
        isMatch = await user.comparePassword(password);
        if (isMatch) {
          authModel = user;
          console.log('Authenticated with user model');
        }
      } catch (error) {
        console.error('Error comparing password with user model:', error);
      }
    }

    if (!isMatch || !authModel) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const status = authModel.status || (vendor ? vendor.status : null);
    if (status !== 'approved' && status !== 'active') {
      return res.status(403).json({ message: 'Vendor account is not yet approved.' });
    }

    const vendorId = vendor ? vendor._id : user._id;
    const vendorEmail = vendor ? vendor.contactEmail : user.email;
    const vendorName = vendor ? vendor.businessName : user.name;
    const vendorStatus = status;
    const photo = user ? user.photo : null;

    const token = jwt.sign(
      { 
        vendorId: vendorId,
        id: vendorId,
        role: 'vendor',
        email: vendorEmail
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      vendor: {
        id: vendorId,
        businessName: vendorName,
        name: vendorName,
        email: vendorEmail,
        status: vendorStatus,
        photo: photo,
        role: 'vendor'
      }
    });
  } catch (error) {
    console.error('Vendor login error:', error);
    res.status(500).json({ message: 'Failed to login.' });
  }
});

// Get all pending vendors (admin)
router.get('/pending', verifyToken, async (req, res) => {
  try {
    const pendingVendors = await Vendor.find({ status: 'pending' });
    res.json(pendingVendors);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pending vendors.' });
  }
});

// Approve a vendor (admin)
router.put('/:id/approve', verifyToken, async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { status: 'approved' },
      { new: true }
    );
    if (!vendor) return res.status(404).json({ message: 'Vendor not found.' });
    res.json({ message: 'Vendor approved.', vendor });
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve vendor.' });
  }
});

// Reject a vendor (admin)
router.put('/:id/reject', verifyToken, async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
      { new: true }
    );
    if (!vendor) return res.status(404).json({ message: 'Vendor not found.' });
    res.json({ message: 'Vendor rejected.', vendor });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reject vendor.' });
  }
});

// Get vendor's events
router.get('/events', verifyToken, verifyVendor, async (req, res) => {
  try {
    const events = await Event.find({ createdBy: req.user.id })
      .sort({ createdAt: -1 });
    res.json(events.map(withLiveStatus));
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'Error fetching events' });
  }
});

// Get vendor's attendance list (Present vs Absent Breakdown)
router.get('/events/:id/attendance', verifyToken, verifyVendor, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('attendees', 'name email avatar photo');
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const checkedInUserIds = new Set(
      (event.checkIns || [])
        .filter(c => c.checkedIn)
        .map(c => c.user?._id?.toString() || c.user?.toString())
    );

    const presentList = [];
    const absentList = [];

    (event.attendees || []).forEach(attendee => {
      const isPresent = checkedInUserIds.has(attendee._id.toString());
      const attendeeData = {
        _id: attendee._id,
        name: attendee.name,
        email: attendee.email,
        status: isPresent ? 'present' : 'absent'
      };

      if (isPresent) {
        presentList.push(attendeeData);
      } else {
        absentList.push(attendeeData);
      }
    });

    res.json({
      totalAttendees: event.attendees.length,
      presentCount: presentList.length,
      absentCount: absentList.length,
      presentList,
      absentList
    });
  } catch (error) {
    console.error('Attendance fetch error:', error);
    res.status(500).json({ message: 'Error fetching attendance details' });
  }
});

// Get dashboard stats for a vendor
router.get('/stats', verifyToken, verifyVendor, async (req, res) => {
  try {
    const vendorId = req.user.id;

    const events = await Event.find({ 
      $or: [
        { createdBy: vendorId },
        { createdBy: req.user.vendorId },
        { createdBy: req.user.id }
      ]
    });

    const activeEvents = events.filter(event => {
      const status = getLiveStatus(event);
      return status === 'ongoing' || status === 'upcoming';
    }).length;

    const totalRegistrations = events.reduce(
      (sum, event) => sum + (event.attendees ? event.attendees.length : 0), 0
    );

    const Revenue = require('../models/Revenue');
    const revenueData = await Revenue.find({
      vendor: vendorId,
      status: { $ne: 'refunded' }
    });
    const totalRevenue = revenueData.reduce((sum, item) => sum + (item.netAmount || 0), 0);

    res.json({
      totalEvents: events.length,
      activeEvents,
      totalRegistrations,
      totalRevenue
    });
  } catch (error) {
    console.error('Error fetching vendor stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get vendor's recent events
router.get('/events/recent', verifyToken, verifyVendor, async (req, res) => {
  try {
    const recentEvents = await Event.find({ createdBy: req.user.id })
      .sort({ createdAt: -1 })
      .limit(5);
    res.json(recentEvents);
  } catch (error) {
    console.error('Error fetching recent events:', error);
    res.status(500).json({ message: 'Error fetching recent events' });
  }
});

// Create new event
router.post('/events', verifyToken, verifyVendor, eventUpload.single('image'), async (req, res) => {
  try {
    if (req.body.tickets && typeof req.body.tickets === 'string') {
      try {
        req.body.tickets = JSON.parse(req.body.tickets);
      } catch (err) {
        console.error('Error parsing tickets JSON:', err);
        return res.status(400).json({ message: 'Invalid tickets data format' });
      }
    }

    const eventData = {
      ...req.body,
      createdBy: req.user.id,
      createdByModel: 'Vendor',
      hostName: req.user.name,
      hostEmail: req.user.email,
      hostAvatar: req.user.avatar
    };

    if (req.file) {
      eventData.image = req.file.path;
    }

    const event = new Event(eventData);
    await event.save();
    res.status(201).json({
      event,
      eventId: event._id
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ message: 'Error creating event' });
  }
});

// Update event
router.put('/events/:id', verifyToken, verifyVendor, eventUpload.single('image'), async (req, res) => {
  try {
    const event = await Event.findOne({ 
      _id: req.params.id,
      createdBy: req.user.id 
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found or unauthorized' });
    }

    if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
      Object.assign(event, req.body);
    } else {
      Object.keys(req.body).forEach(key => {
        try {
          const parsedValue = JSON.parse(req.body[key]);
          event[key] = parsedValue;
        } catch (e) {
          event[key] = req.body[key];
        }
      });
      
      if (req.file) {
        event.image = req.file.path;
      }
    }
    
    event.attendees = [];
    event.checkIns = [];
    event.status = 'upcoming';               

    await event.save();
    res.json(event);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ message: 'Error updating event', error: error.message });
  }
});

// Delete event
router.delete('/events/:id', verifyToken, verifyVendor, async (req, res) => {
  try {
    const event = await Event.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user.id
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found or unauthorized' });
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting event' });
  }
});

// Get vendor's registrations
router.get('/registrations', verifyToken, verifyVendor, async (req, res) => {
  try {
    const events = await Event.find({ createdBy: req.user.id, createdByModel: 'Vendor' }).populate('attendees', 'name email avatar');
    const registrations = events.flatMap(event =>
      (event.attendees || []).map(user => ({
        userName: user.name,
        userEmail: user.email,
        eventTitle: event.name,
        eventDate: event.startDate,
        createdAt: event.createdAt,
        status: 'approved',
        _id: user._id
      }))
    );
    res.json(registrations);
  } catch (error) {
    console.error('Error fetching vendor registrations:', error);
    res.status(500).json({ message: 'Error fetching registrations' });
  }
});

// Get vendor profile
router.get('/profile', verifyToken, verifyVendor, async (req, res) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    
    const [user, vendor] = await Promise.all([
      User.findById(vendorId),
      Vendor.findById(vendorId)
    ]);

    if (!user && !vendor) {
      return res.status(404).json({ message: 'Vendor not found.' });
    }

    const profile = {
      id: vendorId,
      businessName: (user?.businessName || vendor?.businessName),
      email: (user?.email || vendor?.contactEmail),
      phone: (user?.phoneNumber || vendor?.contactPhone),
      services: vendor?.services || [],
      description: vendor?.description,
      portfolio: vendor?.portfolio || [],
      socialLinks: vendor?.socialLinks || {},
      status: (user?.status || vendor?.status)
    };

    res.json(profile);
  } catch (error) {
    console.error('Get vendor profile error:', error);
    res.status(500).json({ message: 'Failed to get vendor profile.' });
  }
});

// Update vendor profile
router.put('/profile', verifyToken, profileUpload.single('photo'), async (req, res) => {
  try {
    const vendorId = req.user._id || req.user.id;
    if (!vendorId) {
      return res.status(400).json({ message: 'Vendor ID not found in token' });
    }

    const {
      businessName,
      name,
      email,
      phone,
      services,
      description,
      contactEmail,
      contactPhone,
      socialLinks
    } = req.body;

    let photoPath = null;
    if (req.file) {
      photoPath = `/uploads/profiles/${req.file.filename}`;
    }

    let parsedSocialLinks = {};
    try {
      if (socialLinks) {
        parsedSocialLinks = typeof socialLinks === 'string' ? JSON.parse(socialLinks) : socialLinks;
      }
    } catch (e) {
      parsedSocialLinks = {};
    }

    const userUpdateFields = {};
    const vendorUpdateFields = {};
    
    if (name) userUpdateFields.name = name;
    if (email) userUpdateFields.email = email;
    if (phone) userUpdateFields.phoneNumber = phone;
    if (photoPath) userUpdateFields.photo = photoPath;
    
    if (businessName) {
      userUpdateFields.businessName = businessName;
      vendorUpdateFields.businessName = businessName;
    }
    if (services) vendorUpdateFields.services = Array.isArray(services) ? services : [services];
    if (description) vendorUpdateFields.description = description;
    if (contactEmail) vendorUpdateFields.contactEmail = contactEmail;
    if (contactPhone) vendorUpdateFields.contactPhone = contactPhone;
    if (Object.keys(parsedSocialLinks).length > 0) vendorUpdateFields.socialLinks = parsedSocialLinks;

    let updatedUser = null;
    let updatedVendor = null;
    
    try {
      const existingUser = await User.findById(vendorId);
      
      if (existingUser) {
        updatedUser = await User.findByIdAndUpdate(
          vendorId,
          userUpdateFields,
          { new: true }
        );
      } else {
        const newUser = new User({
          _id: vendorId,
          name: name || 'Vendor',
          email: email || contactEmail,
          password: await bcrypt.hash('tempPassword123', 10),
          role: 'vendor',
          status: 'approved',
          phoneNumber: phone || contactPhone,
          photo: photoPath
        });
        updatedUser = await newUser.save();
      }
      
      updatedVendor = await Vendor.findByIdAndUpdate(
        vendorId,
        vendorUpdateFields,
        { new: true }
      );
    } catch (error) {
      console.error('Error updating user/vendor:', error);
    }

    if (!updatedVendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    const userToReturn = updatedUser ? {
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phoneNumber,
      photo: updatedUser.photo,
      role: 'vendor',
      status: updatedUser.status || updatedVendor.status
    } : {
      id: vendorId,
      name: name || updatedVendor.businessName,
      email: email || updatedVendor.contactEmail,
      phone: phone || updatedVendor.contactPhone,
      photo: photoPath,
      role: 'vendor',
      status: updatedVendor.status
    };

    res.json({
      message: 'Vendor profile updated successfully',
      user: userToReturn,
      vendor: updatedVendor
    });
  } catch (error) {
    console.error('Error updating vendor profile:', error);
    res.status(500).json({ message: 'Failed to update vendor profile', error: error.message });
  }
});

// AI Event Description Generator
router.post('/ai/generate-description', verifyToken, verifyVendor, async (req, res) => {
  try {
    const { name, location, startDate, endDate, startTime, endTime, eventType } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Event name is required to generate a description.' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ message: 'AI service is not configured.' });
    }

    const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
    const llm = new ChatGoogleGenerativeAI({
      apiKey,
      model: 'gemini-2.5-flash',
      maxOutputTokens: 200,
      temperature: 0.7
    });

    const prompt = `You are a professional event copywriter. Write an engaging, concise event description (3-4 sentences, max 100 words) for the following event. Plain paragraph text only, no headings or bullet points.

Event Name: ${name}
Event Type: ${eventType || 'General Event'}
Location: ${location || 'To be announced'}
Date: ${startDate ? new Date(startDate).toDateString() : 'TBA'}${endDate && endDate !== startDate ? ' to ' + new Date(endDate).toDateString() : ''}
Time: ${startTime || 'TBA'}${endTime ? ' - ' + endTime : ''}

Write the description now:`;

    const result = await llm.invoke(prompt);
    const description = result.content?.trim();

    if (!description) {
      return res.status(500).json({ message: 'AI did not return a description. Please try again.' });
    }

    res.json({ description });
  } catch (error) {
    console.error('AI description error:', error);
    res.status(500).json({ message: 'Failed to generate description. Please try again.' });
  }
});

// Event Conflict Checker
router.post('/events/check-conflict', verifyToken, verifyVendor, async (req, res) => {
  try {
    const { startDate, endDate, startTime, endTime, location, excludeEventId } = req.body;

    if (!startDate || !startTime) {
      return res.json({ conflict: false });
    }

    const query = { createdBy: req.user.id };
    if (excludeEventId) query._id = { $ne: excludeEventId };

    const myEvents = await Event.find(query);

    const newStart = new Date(startDate);
    const [nsh, nsm] = (startTime || '00:00').split(':');
    newStart.setHours(parseInt(nsh), parseInt(nsm), 0, 0);

    const newEnd = new Date(endDate || startDate);
    const [neh, nem] = (endTime || '23:59').split(':');
    newEnd.setHours(parseInt(neh), parseInt(nem), 0, 0);

    const conflicts = [];

    for (const ev of myEvents) {
      const evStart = new Date(ev.startDate);
      const [evsh, evsm] = (ev.startTime || '00:00').split(':');
      evStart.setHours(parseInt(evsh), parseInt(evsm), 0, 0);

      const evEnd = new Date(ev.endDate || ev.startDate);
      const [eveh, evem] = (ev.endTime || '23:59').split(':');
      evEnd.setHours(parseInt(eveh), parseInt(evem), 0, 0);

      const now = new Date();
      const timeOverlap = newStart < evEnd && newEnd > evStart;
      if (!timeOverlap) continue;
      if (now > evEnd) continue;

      const newAddr = (location || '').toString().trim().toLowerCase();
      const evAddr = (ev.location?.address || ev.location || '').toString().trim().toLowerCase();
      const locationMatch = newAddr && evAddr && newAddr === evAddr;

      if (timeOverlap && locationMatch) {
        conflicts.push({
          eventName: ev.name,
          startDate: ev.startDate,
          startTime: ev.startTime,
          endTime: ev.endTime,
          location: evAddr,
          sameLocation: locationMatch
        });
      }
    }

    if (conflicts.length > 0) {
      const sameLocation = conflicts.some(c => c.sameLocation);
      let message = `Time conflict with your event "${conflicts[0].eventName}"`;
      if (sameLocation) message += ` at the same location`;
      message += `. Please choose a different time${sameLocation ? ' or location' : ''}.`;
      return res.json({ conflict: true, message, conflicts });
    }

    res.json({ conflict: false });
  } catch (error) {
    console.error('Conflict check error:', error);
    res.status(500).json({ message: 'Error checking conflicts' });
  }
});

// /app/src/routes/vendor.js

// Send absent emails route
router.post('/events/:id/send-absent-emails', verifyToken, verifyVendor, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('attendees', 'name email');
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const checkedInUserIds = new Set(
      (event.checkIns || [])
        .filter(c => c.checkedIn)
        .map(c => c.user?._id?.toString() || c.user?.toString())
    );

    const absentAttendees = (event.attendees || []).filter(
      attendee => !checkedInUserIds.has(attendee._id.toString())
    );

    let sentCount = 0;
    for (const attendee of absentAttendees) {
      if (!attendee.email) continue;
      
      // Async call ONLY inside this async router handler:
      await emailService.sendAbsentNotificationEmail(attendee.email, attendee.name, event);
      sentCount++;
    }

    res.json({ message: `Emails sent to ${sentCount} absent attendees.` });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ message: 'Failed to send emails.' });
  }
});

module.exports = router;