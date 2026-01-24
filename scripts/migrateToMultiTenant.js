/**
 * Multi-Tenant Migration Script
 * 
 * This script migrates existing single-tenant data to multi-tenant structure.
 * WARNING: Backup your database before running this script!
 * 
 * Usage: node scripts/migrateToMultiTenant.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const migrateToMultiTenant = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Step 1: Create a default shop for existing data
    console.log('\n=== Step 1: Creating default shop ===');
    const shopsCollection = db.collection('shops');
    
    const defaultShop = await shopsCollection.findOne({ slug: 'default-shop' });
    let shopId;

    if (!defaultShop) {
      const shopResult = await shopsCollection.insertOne({
        name: 'Default Shop',
        slug: 'default-shop',
        ownerId: null, // Will be set later
        plan: 'FREE',
        enabledModules: {
          inventory: true,
          orders: true,
          customers: true
        },
        isActive: true,
        agreedToTerms: true,
        agreedToSellerAgreement: true,
        agreedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      shopId = shopResult.insertedId;
      console.log('✓ Default shop created:', shopId);
    } else {
      shopId = defaultShop._id;
      console.log('✓ Using existing default shop:', shopId);
    }

    // Step 2: Migrate users
    console.log('\n=== Step 2: Migrating users ===');
    const usersCollection = db.collection('users');
    const usersResult = await usersCollection.updateMany(
      { shopId: { $exists: false } },
      { 
        $set: { 
          shopId: shopId,
          role: 'OWNER',
          permissions: {
            canManageProducts: true,
            canManageOrders: true,
            canManageCustomers: true,
            canViewReports: true
          },
          isActive: true
        } 
      }
    );
    console.log(`✓ Migrated ${usersResult.modifiedCount} users`);

    // Set first user as shop owner
    const firstUser = await usersCollection.findOne({ shopId: shopId });
    if (firstUser) {
      await shopsCollection.updateOne(
        { _id: shopId },
        { $set: { ownerId: firstUser._id } }
      );
      console.log('✓ Set shop owner:', firstUser._id);
    }

    // Step 3: Migrate products
    console.log('\n=== Step 3: Migrating products ===');
    const productsCollection = db.collection('products');
    const productsResult = await productsCollection.updateMany(
      { shopId: { $exists: false } },
      { $set: { shopId: shopId } }
    );
    console.log(`✓ Migrated ${productsResult.modifiedCount} products`);

    // Step 4: Migrate orders
    console.log('\n=== Step 4: Migrating orders ===');
    const ordersCollection = db.collection('orders');
    const ordersResult = await ordersCollection.updateMany(
      { shopId: { $exists: false } },
      { $set: { shopId: shopId } }
    );
    console.log(`✓ Migrated ${ordersResult.modifiedCount} orders`);

    // Step 5: Migrate carts
    console.log('\n=== Step 5: Migrating carts ===');
    const cartsCollection = db.collection('carts');
    const cartsResult = await cartsCollection.updateMany(
      { shopId: { $exists: false } },
      { $set: { shopId: shopId } }
    );
    console.log(`✓ Migrated ${cartsResult.modifiedCount} carts`);

    // Step 6: Drop old unique indexes
    console.log('\n=== Step 6: Dropping old unique indexes ===');
    
    try {
      await usersCollection.dropIndex('email_1');
      console.log('✓ Dropped users.email_1 index');
    } catch (e) {
      console.log('- users.email_1 index not found or already dropped');
    }

    try {
      await usersCollection.dropIndex('phone_1');
      console.log('✓ Dropped users.phone_1 index');
    } catch (e) {
      console.log('- users.phone_1 index not found or already dropped');
    }

    try {
      await productsCollection.dropIndex('slug_1');
      console.log('✓ Dropped products.slug_1 index');
    } catch (e) {
      console.log('- products.slug_1 index not found or already dropped');
    }

    try {
      await cartsCollection.dropIndex('user_1');
      console.log('✓ Dropped carts.user_1 index');
    } catch (e) {
      console.log('- carts.user_1 index not found or already dropped');
    }

    // Step 7: Create new compound indexes
    console.log('\n=== Step 7: Creating multi-tenant indexes ===');
    
    await usersCollection.createIndex({ shopId: 1, email: 1 }, { unique: true });
    console.log('✓ Created users(shopId, email) unique index');

    await usersCollection.createIndex({ shopId: 1, phone: 1 }, { unique: true });
    console.log('✓ Created users(shopId, phone) unique index');

    await productsCollection.createIndex({ shopId: 1, slug: 1 }, { unique: true });
    console.log('✓ Created products(shopId, slug) unique index');

    await ordersCollection.createIndex({ shopId: 1, orderNumber: 1 }, { unique: true });
    console.log('✓ Created orders(shopId, orderNumber) unique index');

    await cartsCollection.createIndex({ shopId: 1, user: 1 }, { unique: true });
    console.log('✓ Created carts(shopId, user) unique index');

    console.log('\n✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Test the application with migrated data');
    console.log('2. Update JWT tokens for existing users (they need to re-login)');
    console.log('3. Verify tenant isolation is working correctly');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
};

migrateToMultiTenant();
