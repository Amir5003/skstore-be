const mongoose = require('mongoose');
require('dotenv').config();

const dropOldIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const ordersCollection = db.collection('orders');

    // Get all indexes
    const indexes = await ordersCollection.indexes();
    console.log('Current indexes:', indexes.map(i => i.name));

    // Drop the old orderId index if it exists
    try {
      await ordersCollection.dropIndex('orderId_1');
      console.log('✓ Dropped old orderId_1 index');
    } catch (error) {
      if (error.code === 27) {
        console.log('orderId_1 index does not exist');
      } else {
        throw error;
      }
    }

    // Verify indexes after drop
    const updatedIndexes = await ordersCollection.indexes();
    console.log('Updated indexes:', updatedIndexes.map(i => i.name));

    console.log('✓ Index cleanup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

dropOldIndexes();
