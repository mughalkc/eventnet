const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

dotenv.config({ path: '../../.env' });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/event-platform')
  .then(() => console.log('Connected to MongoDB for seeding'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Function to seed sample registrations (tickets)
async function seedRegistrations() {
  try {
    // Clear existing registrations
    await Registration.deleteMany({});
    console.log('Cleared existing registrations');
    
    // Get users and events
    const users = await User.find({ role: 'user' });
    const events = await Event.find();
    
    if (users.length === 0) {
      console.log('No users found. Please create some users first.');
      process.exit(1);
    }
    
    if (events.length === 0) {
      console.log('No events found. Please create some events first.');
      process.exit(1);
    }
    
    console.log(`Found ${users.length} users and ${events.length} events`);
    
    // Create sample registrations
    const registrations = [];
    
    // Create multiple registrations for each user
    for (const user of users) {
      // Each user registers for 1-3 random events
      const numEvents = Math.floor(Math.random() * 3) + 1;
      const userEvents = [...events].sort(() => 0.5 - Math.random()).slice(0, numEvents);
      
      for (const event of userEvents) {
        const paymentStatus = ['pending', 'completed', 'refunded'][Math.floor(Math.random() * 3)];
        const paymentAmount = event.price || Math.floor(Math.random() * 100) + 20;
        
        registrations.push({
          event: event._id,
          user: user._id,
          status: ['pending', 'confirmed', 'cancelled'][Math.floor(Math.random() * 3)],
          paymentStatus,
          paymentAmount,
          paymentDate: paymentStatus === 'completed' ? new Date() : null,
          registrationDate: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000)
        });
      }
    }
    
    // Insert registrations
    await Registration.insertMany(registrations);
    console.log(`Created ${registrations.length} sample registrations`);
    
    // Log some sample data
    const sampleRegistrations = await Registration.find()
      .populate('event', 'name')
      .populate('user', 'name email')
      .limit(5);
    
    console.log('Sample registrations:');
    sampleRegistrations.forEach(reg => {
      console.log(`- ${reg.user.name} registered for ${reg.event.name}, status: ${reg.paymentStatus}`);
    });
    
    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding registrations:', error);
  } finally {
    mongoose.disconnect();
  }
}

// Run the seeding function
seedRegistrations();
