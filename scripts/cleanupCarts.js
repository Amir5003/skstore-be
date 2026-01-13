require('dotenv').config();
const mongoose = require('mongoose');
const Cart = require('../models/Cart.model');

const cleanupCarts = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Remove all carts with null or invalid user
    const result = await Cart.deleteMany({
      $or: [
        { user: null },
        { user: { $exists: false } }
      ]
    });

    console.log(`🗑️  Removed ${result.deletedCount} invalid cart(s)`);

    // Drop the old index if it exists
    try {
      await Cart.collection.dropIndex('userId_1');
      console.log('✅ Dropped old userId index');
    } catch (error) {
      console.log('ℹ️  No userId index to drop');
    }

    // Ensure correct index on user field
    await Cart.collection.createIndex({ user: 1 }, { unique: true });
    console.log('✅ Created user index');

    console.log('\n✅ Cleanup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
};

cleanupCarts();
