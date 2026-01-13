require('dotenv').config();
const mongoose = require('mongoose');
const Cart = require('../models/Cart.model');

const checkCarts = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    // List all carts without populate
    const carts = await Cart.find({});
    console.log(`Found ${carts.length} cart(s):\n`);
    
    carts.forEach((cart, index) => {
      console.log(`${index + 1}. Cart ID: ${cart._id}`);
      console.log(`   User ID: ${cart.user || 'NULL'}`);
      console.log(`   Items: ${cart.totalItems}`);
      console.log('');
    });

    // Check indexes
    const indexes = await Cart.collection.indexes();
    console.log('Indexes on Cart collection:');
    indexes.forEach(index => {
      console.log(`- ${index.name}:`, JSON.stringify(index.key));
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkCarts();
