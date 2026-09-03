// Load environment variables FIRST before any other imports
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');

// Import models for Cron Job
const Event = require('./models/Event');
const Ticket = require('./models/Ticket');


// Import routes
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const vendorRoutes = require('./routes/vendor');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');
const revenueRoutes = require('./routes/revenue');
const paymentsRoutes = require('./routes/payments');

const chatbotRoutes = require('./routes/chatbot');

// Import email service
const emailService = require('./utils/emailService');

const app = express();

// Middleware ....for help in mobile login
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
  socketTimeoutMS: 45000, // Increase socket timeout
  retryWrites: true,
  retryReads: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  console.log('Attempting to connect to local MongoDB fallback...');
  
  // Try connecting to a local MongoDB instance as fallback
  mongoose.connect('mongodb://localhost:27017/eventnet', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000
  })
  .then(() => console.log('Connected to local MongoDB fallback'))
  .catch(localErr => {
    console.error('Local MongoDB connection error:', localErr);
    console.log('Please check your MongoDB connection settings or ensure MongoDB is running');
  });
});

// Initialize email service
emailService.init();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/contact', require('./routes/contact'));
app.use('/api/events', eventRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api', revenueRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/chatbot', chatbotRoutes);

// Helper function for time parsing in Cron Job
const parseTimeForCron = (timeStr, defaultH, defaultM) => {
  if (!timeStr) return [defaultH, defaultM];
  const match = String(timeStr).match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!match) return [defaultH, defaultM];
  let h = parseInt(match[1], 10);
  let m = parseInt(match[2], 10);
  if (match[3]) {
    if (match[3].toUpperCase() === 'PM' && h < 12) h += 12;
    if (match[3].toUpperCase() === 'AM' && h === 12) h = 0;
  }
  return [h, m];
};

// AUTOMATED CRON JOB: Runs every 15 minutes to mark ABSENT & send emails
cron.schedule('*/15 * * * *', async () => {
  try {
    const now = new Date();
    const events = await Event.find({ status: { $ne: 'cancelled' } }).lean();

    for (const event of events) {
      if (!event.startDate) continue;

      const end = event.endDate ? new Date(event.endDate) : new Date(event.startDate);
      const [endH, endM] = parseTimeForCron(event.endTime, 23, 59);
      end.setHours(endH, endM, 59, 999);

      // Agar event expire ho chuka ho
      if (now > end) {
        const unverifiedTickets = await Ticket.find({
          event: event._id,
          attendanceStatus: { $ne: 'attended' }
        }).populate('user');

        for (const ticket of unverifiedTickets) {
          if (ticket.attendanceStatus !== 'absent') {
            ticket.attendanceStatus = 'absent';
            await ticket.save();

            if (ticket.user && ticket.user.email) {
              const emailSubject = `Missed Event Notice: ${event.name}`;
              const emailHtml = `
                <h3>Hello ${ticket.user.name},</h3>
                <p>We noticed that you were unable to attend <b>${event.name}</b> which took place recently.</p>
                <p>Your attendance status has been updated to: <b>ABSENT</b>.</p>
                <p>We hope to see you at our future events!</p>
                <br/>
                <p>Best regards,<br/>EventNet Team</p>
              `;

              if (emailService.sendEmail) {
                await emailService.sendEmail(ticket.user.email, emailSubject, emailHtml);
              }
              console.log(`Absent email sent to ${ticket.user.email} for event ${event.name}`);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error running expired attendance cron job:', error);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});