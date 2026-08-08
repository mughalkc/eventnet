// Load environment variables FIRST before any other imports
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

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
app.use('/api/events', eventRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api', revenueRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/chatbot', chatbotRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});