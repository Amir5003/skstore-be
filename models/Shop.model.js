const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Shop name is required'],
    trim: true,
    maxlength: [100, 'Shop name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens']
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  plan: {
    type: String,
    enum: ['FREE', 'BASIC', 'PREMIUM'],
    default: 'FREE'
  },
  enabledModules: {
    inventory: {
      type: Boolean,
      default: true
    },
    orders: {
      type: Boolean,
      default: true
    },
    customers: {
      type: Boolean,
      default: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
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
  contact: {
    phone: String,
    email: String,
    whatsapp: String
  },
  gst: {
    number: String,
    registered: {
      type: Boolean,
      default: false
    }
  },
  // Legal compliance
  agreedToTerms: {
    type: Boolean,
    required: [true, 'Must agree to terms and conditions'],
    default: false
  },
  agreedToSellerAgreement: {
    type: Boolean,
    required: [true, 'Must agree to seller agreement'],
    default: false
  },
  agreedToProhibitedItems: {
    type: Boolean,
    required: [true, 'Must agree to prohibited items policy'],
    default: false
  },
  agreedAt: {
    type: Date
  },
  // Suspension tracking
  suspendedAt: Date,
  suspensionReason: String,
  suspendedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for performance
shopSchema.index({ slug: 1 });
shopSchema.index({ ownerId: 1 });
shopSchema.index({ isActive: 1 });
shopSchema.index({ createdAt: -1 });

// Generate slug from shop name if not provided
shopSchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
  next();
});

// Record agreement timestamp
shopSchema.pre('save', function(next) {
  if (this.isModified('agreedToTerms') || this.isModified('agreedToSellerAgreement') || this.isModified('agreedToProhibitedItems')) {
    if (this.agreedToTerms && this.agreedToSellerAgreement && this.agreedToProhibitedItems && !this.agreedAt) {
      this.agreedAt = new Date();
    }
  }
  next();
});

const Shop = mongoose.model('Shop', shopSchema);

module.exports = Shop;
