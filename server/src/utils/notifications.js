const nodemailer = require('nodemailer')
const User = require('../models/User')

// Email configuration
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
})

// Send event notification
const sendEventNotification = async (event, userId, type) => {
  try {
    // Get user details
    const user = await User.findById(userId)
    if (!user) return

    // Email notification
    if (type === 'registration') {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: `Registration Confirmed: ${event.name}`,
        html: `
          <h1>Your registration is confirmed!</h1>
          <p>Event: ${event.name}</p>
          <p>Date: ${new Date(event.startDate).toLocaleDateString()}</p>
          <p>Time: ${new Date(event.startDate).toLocaleTimeString()}</p>
          <p>Location: ${event.location}</p>
        `
      })
    }
  } catch (error) {
    console.error('Send notification error:', error)
  }
}

module.exports = {
  sendEventNotification
} 