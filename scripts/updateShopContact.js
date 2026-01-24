const mongoose = require('mongoose');
require('dotenv').config();

// Import Shop model
const Shop = require('../models/Shop.model');

const updateShopContact = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');

    // Get the shop by slug
    const shopSlug = 'amir-test'; // Change this to your shop slug
    
    const shop = await Shop.findOne({ slug: shopSlug });
    
    if (!shop) {
      console.log('❌ Shop not found');
      process.exit(1);
    }

    console.log('Found shop:', shop.name);
    console.log('Current contact:', shop.contact);
    console.log('Current address:', shop.address);

    // Update contact information
    shop.contact = {
      phone: '2222222222', // Change to your phone number
      email: 'amirsuhel50030@gmail.com', // Change to your email
      whatsapp: '2222222222' // Change to your WhatsApp number
    };

    // Update address information
    shop.address = {
      addressLine1: '123 Main Street', // Change to your address
      addressLine2: 'Suite 100', // Optional
      city: 'Mumbai', // Change to your city
      state: 'Maharashtra', // Change to your state
      pincode: '400001', // Change to your pincode
      country: 'India'
    };

    await shop.save();

    console.log('\n✅ Shop contact and address updated successfully!');
    console.log('New contact:', shop.contact);
    console.log('New address:', shop.address);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

updateShopContact();
