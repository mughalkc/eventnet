const express = require('express')
const Revenue = require('../models/Revenue')
const Event = require('../models/Event')
const Ticket = require('../models/Ticket')
const { verifyToken } = require('../middleware/auth')
const mongoose = require('mongoose')

const router = express.Router()

// Get all revenue for a vendor
router.get('/vendor/revenue', verifyToken, async (req, res) => {
  try {
    // Ensure user is a vendor
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ message: 'Access denied. Only vendors can view revenue.' })
    }

    const vendorId = req.user.id
    
    // Find all revenue entries for this vendor
    const revenueData = await Revenue.find({ vendor: vendorId })
      .populate('event', 'name startDate')
      .populate('ticket', 'name type')
      .sort({ createdAt: -1 })
    
    return res.status(200).json({ 
      success: true, 
      revenue: revenueData
    })
  } catch (error) {
    console.error('Error fetching vendor revenue:', error)
    return res.status(500).json({ message: 'Server error while fetching revenue data.' })
  }
})

// Get revenue for a specific event
router.get('/vendor/revenue/event/:eventId', verifyToken, async (req, res) => {
  try {
    // Ensure user is a vendor
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ message: 'Access denied. Only vendors can view revenue.' })
    }

    const vendorId = req.user.id
    const { eventId } = req.params
    
    // Ensure the event belongs to this vendor
    const event = await Event.findOne({ _id: eventId, createdBy: vendorId })
    if (!event) {
      return res.status(404).json({ message: 'Event not found or you do not have permission to view its revenue.' })
    }
    
    // Find all revenue entries for this event
    const revenueData = await Revenue.find({ vendor: vendorId, event: eventId })
      .populate('ticket', 'name type')
      .sort({ createdAt: -1 })
    
    return res.status(200).json({ 
      success: true, 
      revenue: revenueData,
      event: {
        name: event.name,
        startDate: event.startDate
      }
    })
  } catch (error) {
    console.error('Error fetching event revenue:', error)
    return res.status(500).json({ message: 'Server error while fetching event revenue data.' })
  }
})

// Get revenue summary statistics for a vendor
router.get('/vendor/revenue/stats', verifyToken, async (req, res) => {
  try {
    // Ensure user is a vendor
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ message: 'Access denied. Only vendors can view revenue statistics.' })
    }

    const vendorId = req.user.id
    
    // Aggregate revenue statistics
    const stats = await Revenue.aggregate([
      { $match: { vendor: new mongoose.Types.ObjectId(vendorId) } },
      { $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalFees: { $sum: '$fee' },
          totalNetAmount: { $sum: '$netAmount' },
          totalTickets: { $sum: '$quantity' },
          pendingRevenue: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0]
            }
          },
          paidRevenue: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0]
            }
          }
        }
      }
    ])
    
    // If no revenue data exists yet, return zeros
    const revenueStats = stats.length > 0 ? stats[0] : {
      totalRevenue: 0,
      totalFees: 0,
      totalNetAmount: 0,
      totalTickets: 0,
      pendingRevenue: 0,
      paidRevenue: 0
    }
    
    // Remove the _id field from the response
    if (revenueStats._id !== undefined) {
      delete revenueStats._id
    }
    
    return res.status(200).json({ 
      success: true, 
      stats: revenueStats
    })
  } catch (error) {
    console.error('Error fetching revenue statistics:', error)
    return res.status(500).json({ message: 'Server error while fetching revenue statistics.' })
  }
})

module.exports = router
