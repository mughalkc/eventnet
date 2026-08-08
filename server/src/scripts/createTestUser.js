const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('../models/User');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function createTestUser() {
  try {
    // Check if test user already exists
    const existingUser = await User.findOne({ email: 'test@example.com' });
    
    if (existingUser) {
      console.log('Test user already exists. Updating password...');
      
      // Hash the password manually
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);
      
      // Update the test user
      await User.findByIdAndUpdate(existingUser._id, {
        password: hashedPassword,
        status: 'approved' // Ensure the user is approved
      });
      
      console.log('Test user password updated successfully!');
    } else {
      console.log('Creating new test user...');
      
      // Hash the password manually
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);
      
      // Create new test user
      const testUser = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: hashedPassword,
        role: 'user',
        status: 'approved'
      });
      
      await testUser.save();
      console.log('Test user created successfully!');
    }
    
    // Display the test user (without password)
    const user = await User.findOne({ email: 'test@example.com' }).select('-password');
    console.log('Test user details:', user);
    
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    mongoose.disconnect();
  }
}

// Run the function
createTestUser();
