const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Order = require('../models/Order.model');

const clearInvoices = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');

    // Clear invoiceUrl and invoiceNumber from all orders
    const result = await Order.updateMany(
      { 
        $or: [
          { invoiceUrl: { $exists: true, $ne: null } },
          { invoiceNumber: { $exists: true, $ne: null } }
        ]
      },
      { 
        $unset: { 
          invoiceUrl: 1,
          invoiceNumber: 1
        }
      }
    );
    
    console.log(`✅ Cleared invoice URLs from ${result.modifiedCount} orders`);

    // Delete all invoice files
    const invoicesDir = path.join(__dirname, '../invoices');
    if (fs.existsSync(invoicesDir)) {
      const files = fs.readdirSync(invoicesDir);
      let deletedCount = 0;
      
      for (const file of files) {
        if (file.endsWith('.pdf')) {
          fs.unlinkSync(path.join(invoicesDir, file));
          deletedCount++;
        }
      }
      
      console.log(`✅ Deleted ${deletedCount} invoice PDF files`);
    } else {
      console.log('⚠️  Invoices directory does not exist');
    }

    console.log('\n✅ All invoices cleared successfully!');
    console.log('📋 Invoices will be regenerated with shop-specific branding on next download');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing invoices:', error);
    process.exit(1);
  }
};

clearInvoices();
