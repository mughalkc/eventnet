const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Vendor = require('../models/Vendor')

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    console.log('Decoded token:', decoded);
    
    // Handle both user and vendor tokens
    if (decoded.role === 'vendor') {
      const vendor = await Vendor.findById(decoded.vendorId || decoded.userId || decoded.id)
      if (!vendor) {
        return res.status(401).json({ message: 'Vendor not found' })
      }
      req.user = {
        _id: vendor._id, // Use _id to match the expected format in routes
        id: vendor._id,
        role: 'vendor',
        email: vendor.contactEmail,
        name: vendor.businessName
      }
    } else {
      const user = await User.findById(decoded.userId || decoded.id)
      if (!user) {
        return res.status(401).json({ message: 'User not found' })
      }
      req.user = user
    }
    
    next()
  } catch (error) {
    console.error('Token verification error:', error)
    return res.status(401).json({ message: 'Invalid token' })
  }
}

const verifyVendor = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' })
  }

  if (req.user.role !== 'vendor') {
    return res.status(403).json({ message: 'Access denied. Vendor role required.' })
  }

  next()
}

const verifyAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' })
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin role required.' })
  }

  next()
}

module.exports = { verifyToken, verifyVendor, verifyAdmin } 