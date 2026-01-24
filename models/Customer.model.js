const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  // CRITICAL: Multi-tenancy - every customer belongs to a shop
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: [true, 'Shop ID is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  address: {
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    pincode: String,
    country: {
      type: String,
      default: 'India'
    }
  },
  notes: String,
  totalOrders: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  lastOrderAt: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date
}, {
  timestamps: true
});

// CRITICAL: Multi-tenancy indexes
// Phone is unique per shop
customerSchema.index({ shopId: 1, phone: 1 }, { unique: true });
customerSchema.index({ shopId: 1, email: 1 }, { sparse: true });
customerSchema.index({ shopId: 1, createdAt: -1 });
customerSchema.index({ shopId: 1, isActive: 1 });
customerSchema.index({ shopId: 1, totalSpent: -1 });

// Soft delete - don't return deleted customers by default
customerSchema.pre(/^find/, function(next) {
  this.where({ isDeleted: false });
  next();
});

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;
