const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
    default: 1
  },
  price: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0
  },
  finalPrice: {
    type: Number,
    required: true
  }
}, { _id: false });

const cartSchema = new mongoose.Schema({
  // CRITICAL: Multi-tenancy - every cart belongs to a shop
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: [true, 'Shop ID is required'],
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [cartItemSchema],
  totalItems: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  finalAmount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Calculate totals before saving
cartSchema.pre('save', function(next) {
  this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
  this.totalAmount = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  this.discount = this.items.reduce((sum, item) => sum + ((item.price - item.finalPrice) * item.quantity), 0);
  this.finalAmount = this.items.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
  next();
});

// CRITICAL: Multi-tenancy indexes
// User can have only one cart per shop
cartSchema.index({ shopId: 1, user: 1 }, { unique: true });
cartSchema.index({ shopId: 1, updatedAt: -1 });

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
