const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('../models/User');
const Event = require('../models/Event');

dotenv.config({ path: '../../.env' });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/event-platform')
  .then(() => console.log('Connected to MongoDB for seeding'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Function to seed sample users and events
async function seedData() {
  try {
    // Clear existing data
    await User.deleteMany({ role: 'user' }); // Only delete regular users, keep admins
    await Event.deleteMany({});
    console.log('Cleared existing users and events');
    
    // Create sample users
    const users = [];
    for (let i = 1; i <= 10; i++) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      users.push({
        name: `User ${i}`,
        email: `user${i}@example.com`,
        password: hashedPassword,
        role: 'user',
        status: 'active',
        phone: `123-456-${1000 + i}`,
        avatar: `https://randomuser.me/api/portraits/${i % 2 === 0 ? 'men' : 'women'}/${i}.jpg`,
        createdAt: new Date()
      });
    }
    
    const createdUsers = await User.insertMany(users);
    console.log(`Created ${createdUsers.length} sample users`);
    
    // Create sample events
    const events = [];
    const eventThemes = ['Music', 'Technology', 'Food', 'Sports', 'Art', 'Business'];
    const locations = ['New York', 'San Francisco', 'Chicago', 'Miami', 'Austin', 'Seattle'];
    
    for (let i = 1; i <= 8; i++) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 30));
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 3) + 1);
      
      events.push({
        name: `${eventThemes[i % eventThemes.length]} Conference ${i}`,
        description: `A great ${eventThemes[i % eventThemes.length].toLowerCase()} event for enthusiasts.`,
        startDate,
        endDate,
        startTime: '09:00',
        endTime: '17:00',
        location: `${locations[i % locations.length]} Convention Center`,
        theme: eventThemes[i % eventThemes.length],
        isPublic: true,
        requireApproval: false,
        capacity: 100,
        maxCapacity: 150,
        price: Math.floor(Math.random() * 100) + 50,
        createdBy: createdUsers[i % createdUsers.length]._id,
        status: ['upcoming', 'ongoing', 'completed'][Math.floor(Math.random() * 3)],
        image: `https://picsum.photos/800/400?random=${i}`
      });
    }
    
    const createdEvents = await Event.insertMany(events);
    console.log(`Created ${createdEvents.length} sample events`);
    
    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    mongoose.disconnect();
  }
}

// Run the seeding function
seedData();
