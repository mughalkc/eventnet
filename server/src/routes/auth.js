const express = require('express')
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const { verifyToken } = require('../middleware/auth')
const emailService = require('../utils/emailService')
const fs = require('fs')
const path = require('path')
const multer = require('multer')

const router = express.Router()

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body

    // Check if user already exists
    let user = await User.findOne({ email })
    if (user) {
      return res.status(400).json({ message: 'User already exists' })
    }

    // Validate role
    const validRoles = ['user', 'vendor', 'admin']
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' })
    }

    // Set initial status based on role
    let status = 'approved'
    if (role === 'vendor') {
      status = 'pending'
    } else if (role === 'admin') {
      // Only allow admin creation if explicitly requested and validated
      status = 'pending'
    }

    // Create new user
    user = new User({
      name,
      email,
      password,
      role,
      status
    })

    await user.save()

    // Generate OTP
const otp = crypto.randomInt(100000, 999999).toString()
const otpExpiry = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

user.otp = otp
user.otpExpiry = otpExpiry
user.isVerified = false
await user.save()

// Send OTP email
try {
  await emailService.sendEmail({
    to: email,
    subject: 'EventNet - Verify Your Email',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #4169E1;">EventNet</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Your verification code is:</p>
        <h1 style="color: #4169E1; letter-spacing: 8px;">${otp}</h1>
        <p>This code expires in <strong>10 minutes</strong>.</p>
      </div>
    `
  })
} catch (emailError) {
  console.error('OTP email error:', emailError)
}

return res.status(201).json({
  message: 'OTP sent to your email. Please verify.',
  requiresVerification: true,
  userId: user._id
})


// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { userId, otp } = req.body

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' })
    }

    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ message: 'OTP expired. Please register again.' })
    }

    user.isVerified = true
    user.otp = undefined
    user.otpExpiry = undefined
    await user.save()

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    })
  } catch (error) {
    console.error('OTP verify error:', error)
    res.status(500).json({ message: 'Verification failed' })
  }
})

// Login
router.post('/login', async (req, res) => {
  try {
    console.log('Login attempt:', req.body);
    const { email, password, role } = req.body

    // Find user
    const user = await User.findOne({ email })
    console.log('User found:', user ? 'Yes' : 'No');
    if (!user) {
      console.log('Login failed: User not found');
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // Check password
    console.log('Comparing password...');
    const isMatch = await user.comparePassword(password)
    console.log('Password match:', isMatch ? 'Yes' : 'No');
    if (!isMatch) {
      console.log('Login failed: Password mismatch');
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // Check if user has the requested role
    console.log('Checking role:', role, 'User role:', user.role);
    if (role && user.role !== role) {
      console.log('Login failed: Role mismatch');
      return res.status(403).json({ message: `Invalid role. You are not a ${role}.` })
    }

    // Check if vendor is approved
    if (user.role === 'vendor' && user.status !== 'approved') {
      return res.status(403).json({ message: 'Vendor account is not approved' })
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email first' })
    }

    // Generate token
    const token = jwt.sign(
      { 
        userId: user._id,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    console.log('User login successful. Returning data:', {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      photo: user.photo
    });

    // Send login notification email
    try {
      // Get basic login info from request
      const loginInfo = {
        ip: req.ip || req.connection.remoteAddress,
        browser: req.headers['user-agent'],
        device: req.headers['user-agent'] ? 
          req.headers['user-agent'].includes('Mobile') ? 'Mobile' : 'Desktop' : 'Unknown'
      };
      
      // Send notification email asynchronously (don't await)
      emailService.sendLoginNotificationEmail(user.email, user.name, user.role, loginInfo)
        .then(() => console.log(`Login notification email sent to ${user.email}`))
        .catch(err => console.error('Error sending login notification:', err));
    } catch (error) {
      // Just log the error, don't fail the login if email sending fails
      console.error('Error preparing login notification email:', error);
    }

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        photo: user.photo
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Login failed' })
  }
})

// Get current user
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password')
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    res.json(user)
  } catch (error) {
    console.error('Auth check error:', error)
    res.status(401).json({ message: 'Invalid token' })
  }
})

// Update user profile
// Configure storage for profile photos
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dir = path.join(__dirname, '../../uploads/profiles');
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    cb(null, 'profile-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// Update user profile endpoint
router.put('/users/profile', verifyToken, upload.single('photo'), async (req, res) => {
  try {
    console.log('Profile update request received');
    console.log('Request body:', req.body);
    console.log('File upload:', req.file ? 'Yes' : 'No');
    if (req.file) {
      console.log('File details:', {
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
      });
    }
    
    const { name, email, phone } = req.body;
    const userId = req.user._id;
    
    console.log('User ID from token:', userId);
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      console.log('User not found with ID:', userId);
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('Found user:', {
      id: user._id,
      name: user.name,
      email: user.email
    });
    
    // Update user fields
    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    
    // If a new photo was uploaded, update the photo field
    if (req.file) {
      // If there was a previous photo, you might want to delete it
      if (user.photo && user.photo.startsWith('/uploads/')) {
        const oldPhotoPath = path.join(__dirname, '../..', user.photo);
        console.log('Checking for old photo at:', oldPhotoPath);
        if (fs.existsSync(oldPhotoPath)) {
          console.log('Deleting old photo');
          fs.unlinkSync(oldPhotoPath);
        }
      }
      
      // Set the new photo path
      user.photo = `/uploads/profiles/${req.file.filename}`;
      console.log('Updated photo path:', user.photo);
    }
    
    // Save the updated user
    await user.save();
    console.log('User saved successfully');
    
    // Return the updated user (without password)
    const updatedUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      photo: user.photo,
      role: user.role,
      status: user.status
    };
    
    console.log('Sending updated user data:', updatedUser);
    res.json(updatedUser);
  } catch (error) {
    console.error('Profile update error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
});

module.exports = router