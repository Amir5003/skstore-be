const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  addressLine1: {
    type: String,
    required: true
  },
  addressLine2: String,
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  pincode: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true,
    default: 'India'
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, { _id: true });

const userSchema = new mongoose.Schema({
  // CRITICAL: Multi-tenancy - every user belongs to a shop
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: [true, 'Shop ID is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  // Role-based access control
  role: {
    type: String,
    enum: ['OWNER', 'STAFF', 'CUSTOMER'],
    required: [true, 'Role is required']
  },
  // Staff permissions (only applicable for STAFF role)
  permissions: {
    canManageProducts: {
      type: Boolean,
      default: false
    },
    canManageOrders: {
      type: Boolean,
      default: false
    },
    canManageCustomers: {
      type: Boolean,
      default: false
    },
    canViewReports: {
      type: Boolean,
      default: false
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  addresses: [addressSchema],
  refreshToken: {
    type: String,
    select: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  lastLogin: Date
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Soft delete - don't return deleted users by default
userSchema.pre(/^find/, function(next) {
  this.where({ isDeleted: false });
  next();
});

// CRITICAL: Multi-tenancy indexes
// Email is unique per shop, not globally
userSchema.index({ shopId: 1, email: 1 }, { unique: true });
userSchema.index({ shopId: 1, phone: 1 }, { unique: true });
userSchema.index({ shopId: 1, role: 1 });
userSchema.index({ shopId: 1, isActive: 1 });
userSchema.index({ shopId: 1, createdAt: -1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
