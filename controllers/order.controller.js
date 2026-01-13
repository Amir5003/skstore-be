const Order = require('../models/Order.model');
const Cart = require('../models/Cart.model');
const Product = require('../models/Product.model');
const User = require('../models/User.model');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { sendOrderPlacedEmail, sendOrderStatusEmail, sendInvoiceEmail } = require('../services/email.service');
const { sendOrderPlacedWhatsApp, sendOrderStatusWhatsApp, sendInvoiceWhatsApp, notifyAdminNewOrder } = require('../services/whatsapp.service');
const { generateInvoice } = require('../services/invoice.service');
const path = require('path');

/**
 * Generate unique order number
 */
const generateOrderNumber = async () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  // Count orders today to get sequence
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));
  
  const todayOrdersCount = await Order.countDocuments({
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  });
  
  const sequence = (todayOrdersCount + 1).toString().padStart(4, '0');
  return `ORD${year}${month}${day}${sequence}`;
};

/**
 * @desc    Create order from cart (COD)
 * @route   POST /api/orders
 * @access  Private
 */
const createOrder = asyncHandler(async (req, res) => {
  const { shippingAddress } = req.body;

  // Get user cart
  const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');

  if (!cart || cart.items.length === 0) {
    throw new AppError('Cart is empty', 400);
  }

  // Validate stock for all items
  for (const item of cart.items) {
    const product = await Product.findById(item.product._id);
    
    if (!product) {
      throw new AppError(`Product ${item.product.name} not found`, 404);
    }

    if (!product.isActive) {
      throw new AppError(`Product ${item.product.name} is not available`, 400);
    }

    if (product.stock < item.quantity) {
      throw new AppError(
        `Insufficient stock for ${item.product.name}. Available: ${product.stock}`,
        400
      );
    }
  }

  // Prepare order items
  const orderItems = cart.items.map(item => ({
    product: item.product._id,
    name: item.product.name,
    image: item.product.images[0] || '',
    quantity: item.quantity,
    price: item.price,
    discount: item.discount,
    finalPrice: item.finalPrice,
    subtotal: item.finalPrice * item.quantity
  }));

  // Calculate totals
  const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  const discount = cart.discount;
  const shippingCharges = subtotal > 500 ? 0 : 50; // Free shipping above ₹500
  const tax = 0; // No tax in phase 1
  const totalAmount = subtotal + shippingCharges + tax;

  // Generate order number
  const orderNumber = await generateOrderNumber();

  // Create order
  const order = await Order.create({
    orderNumber,
    user: req.user._id,
    items: orderItems,
    shippingAddress,
    totalItems: cart.totalItems,
    subtotal,
    discount,
    shippingCharges,
    tax,
    totalAmount,
    paymentMethod: 'COD',
    paymentStatus: 'PENDING',
    orderStatus: 'PLACED'
  });

  // Deduct stock for all items
  for (const item of cart.items) {
    await Product.findByIdAndUpdate(
      item.product._id,
      { $inc: { stock: -item.quantity } }
    );
  }

  // Clear cart
  cart.items = [];
  await cart.save();

  // Send notifications (async, don't block response)
  const user = await User.findById(req.user._id);
  
  Promise.all([
    sendOrderPlacedEmail(user, order),
    sendOrderPlacedWhatsApp(user, order),
    notifyAdminNewOrder(order, user)
  ]).catch(err => console.error('Error sending notifications:', err));

  res.status(201).json({
    success: true,
    message: 'Order placed successfully',
    data: { order }
  });
});

/**
 * @desc    Get user orders
 * @route   GET /api/orders
 * @access  Private
 */
const getMyOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const query = { user: req.user._id };
  if (status) query.orderStatus = status;

  const skip = (page - 1) * limit;

  const orders = await Order.find(query)
    .sort('-createdAt')
    .limit(Number(limit))
    .skip(skip);

  const total = await Order.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * @desc    Get single order
 * @route   GET /api/orders/:id
 * @access  Private
 */
const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email phone');

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // Check ownership (users can only see their own orders, admins can see all)
  if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('Not authorized to access this order', 403);
  }

  res.status(200).json({
    success: true,
    data: { order }
  });
});

/**
 * @desc    Cancel order
 * @route   PATCH /api/orders/:id/cancel
 * @access  Private
 */
const cancelOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // Check ownership
  if (order.user.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized to cancel this order', 403);
  }

  // Can only cancel if order is PLACED or CONFIRMED
  if (!['PLACED', 'CONFIRMED'].includes(order.orderStatus)) {
    throw new AppError('Order cannot be cancelled at this stage', 400);
  }

  // Restore stock
  for (const item of order.items) {
    await Product.findByIdAndUpdate(
      item.product,
      { $inc: { stock: item.quantity } }
    );
  }

  order.orderStatus = 'CANCELLED';
  order.cancelReason = reason;
  await order.save();

  // Send notification
  const user = await User.findById(req.user._id);
  Promise.all([
    sendOrderStatusEmail(user, order, 'CANCELLED'),
    sendOrderStatusWhatsApp(user, order, 'CANCELLED')
  ]).catch(err => console.error('Error sending notifications:', err));

  res.status(200).json({
    success: true,
    message: 'Order cancelled successfully',
    data: { order }
  });
});

/**
 * @desc    Download invoice
 * @route   GET /api/orders/:id/invoice
 * @access  Private
 */
const downloadInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // Check ownership
  if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('Not authorized to access this invoice', 403);
  }

  // Generate invoice if not exists
  if (!order.invoiceUrl) {
    const user = await User.findById(order.user);
    const { filename, filepath, invoiceNumber } = await generateInvoice(order, user);
    
    order.invoiceUrl = `/invoices/${filename}`;
    order.invoiceNumber = invoiceNumber;
    await order.save();

    // Send invoice notification
    Promise.all([
      sendInvoiceEmail(user, order, `${process.env.FRONTEND_URL}${order.invoiceUrl}`),
      sendInvoiceWhatsApp(user, order, `${process.env.FRONTEND_URL}${order.invoiceUrl}`)
    ]).catch(err => console.error('Error sending notifications:', err));
  }

  // Send file
  const filepath = path.join(__dirname, '../invoices', path.basename(order.invoiceUrl));
  res.download(filepath);
});

module.exports = {
  createOrder,
  getMyOrders,
  getOrder,
  cancelOrder,
  downloadInvoice
};
