const mongoose = require('mongoose');
const Product = require('../models/Product.model');
require('dotenv').config();

const categories = ['Belts', 'Wallets', 'Bags', 'Sunglasses', 'Watches', 'Jewelry'];

const sampleProducts = [
  // Belts
  {
    name: 'Premium Leather Belt - Classic Brown',
    slug: 'premium-leather-belt-brown',
    description: 'Handcrafted genuine leather belt with premium buckle. Perfect for formal and casual wear.',
    price: 1299,
    discount: 20,
    category: 'Belts',
    brand: 'SKStore Premium',
    stock: 50,
    images: ['https://images.unsplash.com/photo-1624222247344-550fb60583bb?w=800'],
    specifications: {
      Material: 'Genuine Leather',
      Color: 'Brown',
      Width: '1.5 inches',
      'Buckle Type': 'Pin Buckle',
      'Available Sizes': '32-44 inches'
    },
    isActive: true
  },
  {
    name: 'Reversible Leather Belt - Black/Brown',
    slug: 'reversible-leather-belt-black-brown',
    description: 'Two belts in one! Premium reversible leather belt with dual color options.',
    price: 1499,
    discount: 15,
    category: 'Belts',
    brand: 'SKStore Premium',
    stock: 35,
    images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800'],
    specifications: {
      Material: 'Genuine Leather',
      Color: 'Black/Brown',
      Width: '1.3 inches',
      'Buckle Type': 'Auto Lock',
      'Available Sizes': '32-44 inches'
    },
    isActive: true
  },
  // Wallets
  {
    name: 'Slim Leather Wallet - Minimalist',
    slug: 'slim-leather-wallet-minimalist',
    description: 'Ultra-slim genuine leather wallet with RFID protection. Holds 8 cards and cash.',
    price: 899,
    discount: 25,
    category: 'Wallets',
    brand: 'SKStore Premium',
    stock: 60,
    images: ['https://images.unsplash.com/photo-1627123424574-724758594e93?w=800'],
    specifications: {
      Material: 'Genuine Leather',
      Color: 'Black',
      Type: 'Bifold',
      'Card Slots': '8',
      'RFID Protection': 'Yes'
    },
    isActive: true
  },
  {
    name: 'Classic Bifold Wallet - Brown',
    slug: 'classic-bifold-wallet-brown',
    description: 'Traditional bifold wallet with multiple card slots and spacious cash compartment.',
    price: 999,
    discount: 10,
    category: 'Wallets',
    brand: 'SKStore Premium',
    stock: 45,
    images: ['https://images.unsplash.com/photo-1612900047714-5a0b3e9d9348?w=800'],
    specifications: {
      Material: 'Genuine Leather',
      Color: 'Brown',
      Type: 'Bifold',
      'Card Slots': '12',
      'Coin Pocket': 'Yes'
    },
    isActive: true
  },
  // Bags
  {
    name: 'Leather Messenger Bag - Professional',
    slug: 'leather-messenger-bag-professional',
    description: 'Premium leather messenger bag perfect for work and travel. Fits 15" laptop.',
    price: 3499,
    discount: 30,
    category: 'Bags',
    brand: 'SKStore Premium',
    stock: 25,
    images: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800'],
    specifications: {
      Material: 'Genuine Leather',
      Color: 'Brown',
      'Laptop Size': 'Up to 15 inches',
      Compartments: '3',
      Strap: 'Adjustable'
    },
    isActive: true
  },
  {
    name: 'Backpack - Canvas & Leather',
    slug: 'canvas-leather-backpack',
    description: 'Stylish canvas backpack with leather accents. Perfect for daily commute.',
    price: 2499,
    discount: 20,
    category: 'Bags',
    brand: 'SKStore Premium',
    stock: 40,
    images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800'],
    specifications: {
      Material: 'Canvas with Leather trim',
      Color: 'Grey',
      'Laptop Compartment': 'Yes',
      Volume: '25 Liters',
      Pockets: '5'
    },
    isActive: true
  },
  // Sunglasses
  {
    name: 'Aviator Sunglasses - Classic Gold',
    slug: 'aviator-sunglasses-gold',
    description: 'Classic aviator sunglasses with UV400 protection. Timeless style.',
    price: 1199,
    discount: 40,
    category: 'Sunglasses',
    brand: 'SKStore Premium',
    stock: 70,
    images: ['https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800'],
    specifications: {
      'Frame Material': 'Metal',
      'Lens Type': 'Polarized',
      'UV Protection': 'UV400',
      'Frame Color': 'Gold',
      'Lens Color': 'Brown'
    },
    isActive: true
  },
  {
    name: 'Wayfarer Sunglasses - Black',
    slug: 'wayfarer-sunglasses-black',
    description: 'Iconic wayfarer style sunglasses with premium build quality.',
    price: 999,
    discount: 35,
    category: 'Sunglasses',
    brand: 'SKStore Premium',
    stock: 55,
    images: ['https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800'],
    specifications: {
      'Frame Material': 'Acetate',
      'Lens Type': 'Polarized',
      'UV Protection': 'UV400',
      'Frame Color': 'Black',
      'Lens Color': 'Green'
    },
    isActive: true
  },
  // Watches
  {
    name: 'Chronograph Watch - Stainless Steel',
    slug: 'chronograph-watch-steel',
    description: 'Premium chronograph watch with stainless steel case and leather strap.',
    price: 4999,
    discount: 25,
    category: 'Watches',
    brand: 'SKStore Premium',
    stock: 30,
    images: ['https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800'],
    specifications: {
      'Case Material': 'Stainless Steel',
      'Strap Material': 'Genuine Leather',
      Movement: 'Quartz',
      'Water Resistance': '50M',
      Diameter: '42mm'
    },
    isActive: true
  },
  {
    name: 'Minimalist Watch - Rose Gold',
    slug: 'minimalist-watch-rose-gold',
    description: 'Elegant minimalist design watch with rose gold case and mesh band.',
    price: 2999,
    discount: 30,
    category: 'Watches',
    brand: 'SKStore Premium',
    stock: 45,
    images: ['https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800'],
    specifications: {
      'Case Material': 'Stainless Steel',
      'Strap Material': 'Mesh',
      Movement: 'Quartz',
      'Water Resistance': '30M',
      Diameter: '38mm'
    },
    isActive: true
  },
  // Jewelry
  {
    name: 'Silver Bracelet - Chain Link',
    slug: 'silver-bracelet-chain',
    description: 'Premium sterling silver bracelet with secure clasp. Unisex design.',
    price: 1799,
    discount: 20,
    category: 'Jewelry',
    brand: 'SKStore Premium',
    stock: 40,
    images: ['https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800'],
    specifications: {
      Material: 'Sterling Silver',
      Type: 'Chain Link',
      Length: 'Adjustable',
      Width: '8mm',
      Gender: 'Unisex'
    },
    isActive: true
  },
  {
    name: 'Leather Bracelet - Braided',
    slug: 'leather-bracelet-braided',
    description: 'Handcrafted braided leather bracelet with magnetic clasp.',
    price: 599,
    discount: 15,
    category: 'Jewelry',
    brand: 'SKStore Premium',
    stock: 60,
    images: ['https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=800'],
    specifications: {
      Material: 'Genuine Leather',
      Type: 'Braided',
      Length: 'Adjustable',
      Color: 'Brown',
      Gender: 'Unisex'
    },
    isActive: true
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing products
    await Product.deleteMany({});
    console.log('Cleared existing products');

    // Insert sample products
    const products = await Product.insertMany(sampleProducts);
    console.log(`✅ Successfully added ${products.length} sample products`);

    // Display summary
    console.log('\n📊 Product Summary:');
    for (const category of categories) {
      const count = products.filter(p => p.category === category).length;
      console.log(`   ${category}: ${count} products`);
    }

    console.log('\n✨ Database seeded successfully!');
    console.log('You can now start the server and browse products.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
