require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User.model');

const createTestUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if user already exists
    const existingUser = await User.findOne({ email: 'amirsuhel5003@gmail.com' });
    
    if (existingUser) {
      console.log('ℹ️  User already exists');
      
      // Update password
      existingUser.password = '123456';
      await existingUser.save();
      console.log('✅ Password updated for existing user');
    } else {
      // Create new user
      const user = await User.create({
        name: 'Amir Suhel',
        email: 'amirsuhel5003@gmail.com',
        password: '123456',
        phone: '+91 9876543210',
        role: 'admin',
        status: 'active'
      });
      
      console.log('✅ Test user created successfully');
      console.log('📧 Email:', user.email);
      console.log('🔑 Password: 123456');
      console.log('👤 Role:', user.role);
    }

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

createTestUser();
