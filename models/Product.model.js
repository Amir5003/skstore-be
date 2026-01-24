const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // CRITICAL: Multi-tenancy - every product belongs to a shop
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: [true, 'Shop ID is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  slug: {
    type: String,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
    // Price is per dozen (12 pieces)
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%']
  },
  finalPrice: {
    type: Number
  },
  stock: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    default: 0,
    min: [0, 'Stock cannot be negative']
    // Stock is tracked in dozens
  },
  images: [{
    type: String
  }],
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Belts', 'Wallets', 'Bags', 'Glasses', 'Accessories', 'Electronics', 'Clothing', 'Home & Kitchen', 'Books', 'Sports', 'Beauty', 'Toys', 'Other']
  },
  brand: {
    type: String,
    trim: true
  },
  specifications: {
    type: Map,
    of: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create slug from name before saving
productSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Date.now();
  }
  
  // Calculate final price
  if (this.isModified('price') || this.isModified('discount')) {
    this.finalPrice = this.price - (this.price * this.discount / 100);
  }
  
  next();
});

// Soft delete - don't return deleted products by default
productSchema.pre(/^find/, function(next) {
  this.where({ isDeleted: false });
  next();
});

// CRITICAL: Multi-tenancy indexes
// Slug is unique per shop, not globally
productSchema.index({ shopId: 1, slug: 1 }, { unique: true });
productSchema.index({ shopId: 1, category: 1 });
productSchema.index({ shopId: 1, isActive: 1 });
productSchema.index({ shopId: 1, createdAt: -1 });
productSchema.index({ shopId: 1, name: 'text', description: 'text' });
productSchema.index({ category: 1, isActive: 1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
