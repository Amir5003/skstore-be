const Cart = require('../models/Cart.model');
const Product = require('../models/Product.model');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { shopQuery } = require('../middlewares/tenantIsolation.middleware');

/**
 * @desc    Get user cart
 * @route   GET /api/cart
 * @access  Private
 */
const getCart = asyncHandler(async (req, res) => {
  // CRITICAL: Find cart with tenant isolation
  let cart = await Cart.findOne(shopQuery(req, { user: req.user._id })).populate('items.product');

  if (!cart) {
    // CRITICAL: Create cart with shopId
    cart = await Cart.create({ shopId: req.shopId, user: req.user._id, items: [] });
  }

  res.status(200).json({
    success: true,
    data: { cart }
  });
});

/**
 * @desc    Add item to cart
 * @route   POST /api/cart/items
 * @access  Private
 */
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  // CRITICAL: Validate product with tenant isolation
  const product = await Product.findOne(shopQuery(req, { _id: productId }));
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  if (!product.isActive) {
    throw new AppError('Product is not available', 400);
  }

  if (product.stock < quantity) {
    throw new AppError('Insufficient stock', 400);
  }

  // Get or create cart with tenant isolation
  let cart = await Cart.findOne(shopQuery(req, { user: req.user._id }));
  if (!cart) {
    cart = new Cart({ shopId: req.shopId, user: req.user._id, items: [] });
  }

  // Check if product already in cart
  const existingItemIndex = cart.items.findIndex(
    item => item.product.toString() === productId
  );

  if (existingItemIndex > -1) {
    // Update quantity
    const newQuantity = cart.items[existingItemIndex].quantity + quantity;
    
    if (product.stock < newQuantity) {
      throw new AppError('Insufficient stock', 400);
    }
    
    cart.items[existingItemIndex].quantity = newQuantity;
  } else {
    // Add new item
    cart.items.push({
      product: productId,
      quantity,
      price: product.price,
      discount: product.discount,
      finalPrice: product.finalPrice
    });
  }

  await cart.save();
  await cart.populate('items.product');

  res.status(200).json({
    success: true,
    message: 'Item added to cart',
    data: { cart }
  });
});

/**
 * @desc    Update cart item quantity
 * @route   PUT /api/cart/items/:productId
 * @access  Private
 */
const updateCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  if (quantity < 1) {
    throw new AppError('Quantity must be at least 1', 400);
  }

  // CRITICAL: Find cart with tenant isolation
  const cart = await Cart.findOne(shopQuery(req, { user: req.user._id }));
  if (!cart) {
    throw new AppError('Cart not found', 404);
  }

  // Find item in cart
  const itemIndex = cart.items.findIndex(
    item => item.product.toString() === productId
  );

  if (itemIndex === -1) {
    throw new AppError('Item not found in cart', 404);
  }

  // Validate stock with tenant isolation
  const product = await Product.findOne(shopQuery(req, { _id: productId }));
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  if (product.stock < quantity) {
    throw new AppError('Insufficient stock', 400);
  }

  // Update quantity
  cart.items[itemIndex].quantity = quantity;
  await cart.save();
  await cart.populate('items.product');

  res.status(200).json({
    success: true,
    message: 'Cart updated',
    data: { cart }
  });
});

/**
 * @desc    Remove item from cart
 * @route   DELETE /api/cart/items/:productId
 * @access  Private
 */
const removeFromCart = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  // CRITICAL: Find cart with tenant isolation
  const cart = await Cart.findOne(shopQuery(req, { user: req.user._id }));
  if (!cart) {
    throw new AppError('Cart not found', 404);
  }

  // Remove item
  cart.items = cart.items.filter(
    item => item.product.toString() !== productId
  );

  await cart.save();
  await cart.populate('items.product');

  res.status(200).json({
    success: true,
    message: 'Item removed from cart',
    data: { cart }
  });
});

/**
 * @desc    Clear cart
 * @route   DELETE /api/cart
 * @access  Private
 */
const clearCart = asyncHandler(async (req, res) => {
  // CRITICAL: Find cart with tenant isolation
  const cart = await Cart.findOne(shopQuery(req, { user: req.user._id }));
  
  if (cart) {
    cart.items = [];
    await cart.save();
  }

  res.status(200).json({
    success: true,
    message: 'Cart cleared',
    data: { cart }
  });
});

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
};
