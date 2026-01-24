const Order = require('../models/Order.model');
const User = require('../models/User.model');
const Product = require('../models/Product.model');
const AuditLog = require('../models/AuditLog.model');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { sendOrderStatusEmail, sendOrderStatusWhatsApp } = require('../services/email.service');
const { sendOrderStatusWhatsApp: sendWhatsApp } = require('../services/whatsapp.service');
const { shopQuery } = require('../middlewares/tenantIsolation.middleware');

/**
 * @desc    Get dashboard statistics (OWNER/STAFF with permission)
 * @route   GET /api/admin/dashboard/stats
 * @access  Private
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  // CRITICAL: All queries must be scoped to shop
  const baseQuery = { shopId: req.shopId };

  const [
    totalUsers,
    totalProducts,
    totalOrders,
    activeProducts,
    pendingOrders,
    revenue
  ] = await Promise.all([
    User.countDocuments(baseQuery),
    Product.countDocuments(baseQuery),
    Order.countDocuments(baseQuery),
    Product.countDocuments({ ...baseQuery, isActive: true }),
    Order.countDocuments({ ...baseQuery, orderStatus: 'PLACED' }),
    Order.aggregate([
      { $match: { ...baseQuery, orderStatus: { $ne: 'CANCELLED' } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ])
  ]);

  // Daily revenue (last 7 days) - scoped to shop
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);

  const dailyRevenue = await Order.aggregate([
    {
      $match: {
        ...baseQuery,
        createdAt: { $gte: last7Days },
        orderStatus: { $ne: 'CANCELLED' }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$totalAmount' },
        orders: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Monthly revenue (last 6 months) - scoped to shop
  const last6Months = new Date();
  last6Months.setMonth(last6Months.getMonth() - 6);

  const monthlyRevenue = await Order.aggregate([
    {
      $match: {
        ...baseQuery,
        createdAt: { $gte: last6Months },
        orderStatus: { $ne: 'CANCELLED' }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        revenue: { $sum: '$totalAmount' },
        orders: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Low stock alerts - scoped to shop
  const lowStockProducts = await Product.find({
    ...baseQuery,
    stock: { $lt: 10 },
    isActive: true
  }).limit(10);

  // Recent orders - scoped to shop
  const recentOrders = await Order.find(baseQuery)
    .populate('user', 'name email')
    .sort('-createdAt')
    .limit(10);

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      totalProducts,
      activeProducts,
      totalOrders,
      pendingOrders,
      totalRevenue: revenue[0]?.total || 0,
      dailyRevenue,
      monthlyRevenue,
      lowStockProducts,
      recentOrders
    }
  });
});

/**
 * @desc    Get all orders (OWNER/STAFF with permission)
 * @route   GET /api/admin/orders
 * @access  Private
 */
const getAllOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;

  // CRITICAL: Base query with tenant isolation
  const query = shopQuery(req);
  if (status) query.orderStatus = status;
  if (search) {
    query.$or = [
      { orderNumber: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;

  const orders = await Order.find(query)
    .populate('user', 'name email phone')
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
 * @desc    Update order status (OWNER/STAFF with permission)
 * @route   PATCH /api/admin/orders/:id/status
 * @access  Private
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;

  const validStatuses = ['PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    throw new AppError('Invalid order status', 400);
  }

  // CRITICAL: Find order with tenant isolation
  const order = await Order.findOne(shopQuery(req, { _id: req.params.id }));
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // Update status
  order.orderStatus = status;
  if (note) {
    order.statusHistory[order.statusHistory.length - 1].note = note;
  }
  
  if (status === 'DELIVERED') {
    order.deliveredAt = new Date();
    order.paymentStatus = 'COMPLETED'; // Mark payment as completed for COD
  }

  await order.save();

  // Send notifications
  const user = await User.findById(order.user);
  Promise.all([
    sendOrderStatusEmail(user, order, status),
    sendWhatsApp(user, order, status)
  ]).catch(err => console.error('Error sending notifications:', err));

  res.status(200).json({
    success: true,
    message: 'Order status updated successfully',
    data: { order }
  });
});

/**
 * @desc    Get all users/staff (OWNER or STAFF with permission)
 * @route   GET /api/admin/users
 * @access  Private
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, status } = req.query;

  // CRITICAL: Base query with tenant isolation
  const query = shopQuery(req);
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;

  const users = await User.find(query)
    .select('-password -refreshToken')
    .sort('-createdAt')
    .limit(Number(limit))
    .skip(skip);

  const total = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      users,
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
 * @desc    Update user (OWNER only)
 * @route   PUT /api/admin/users/:id
 * @access  Private/OWNER
 */
const updateUser = asyncHandler(async (req, res) => {
  const { name, email, phone, role, status, permissions } = req.body;

  // CRITICAL: Find user with tenant isolation
  const user = await User.findOne(shopQuery(req, { _id: req.params.id }));
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // OWNER can update staff members
  if (user.role === 'OWNER' && req.user._id.toString() !== user._id.toString()) {
    throw new AppError('Cannot modify another owner', 403);
  }

  // Update fields
  if (name) user.name = name;
  if (email) user.email = email;
  if (phone) user.phone = phone;
  if (role && ['OWNER', 'STAFF'].includes(role)) user.role = role;
  if (status) user.status = status;
  if (permissions && user.role === 'STAFF') user.permissions = permissions;

  await user.save();

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: { user }
  });
});

/**
 * @desc    Block/Unblock user (OWNER only)
 * @route   PATCH /api/admin/users/:id/block
 * @access  Private/OWNER
 */
const toggleUserBlock = asyncHandler(async (req, res) => {
  // CRITICAL: Find user with tenant isolation
  const user = await User.findOne(shopQuery(req, { _id: req.params.id }));
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Can't block OWNER users
  if (user.role === 'OWNER') {
    throw new AppError('Cannot block OWNER users', 400);
  }

  user.status = user.status === 'active' ? 'blocked' : 'active';
  await user.save();

  res.status(200).json({
    success: true,
    message: `User ${user.status === 'blocked' ? 'blocked' : 'unblocked'} successfully`,
    data: { user }
  });
});

/**
 * @desc    Delete user (Soft delete - OWNER only)
 * @route   DELETE /api/admin/users/:id
 * @access  Private/OWNER
 */
const deleteUser = asyncHandler(async (req, res) => {
  // CRITICAL: Find user with tenant isolation
  const user = await User.findOne(shopQuery(req, { _id: req.params.id }));
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Can't delete OWNER users
  if (user.role === 'OWNER') {
    throw new AppError('Cannot delete OWNER users', 400);
  }

  user.isDeleted = true;
  user.deletedAt = new Date();
  user.status = 'blocked';
  await user.save();

  res.status(200).json({
    success: true,
    message: 'User deleted successfully'
  });
});

/**
 * @desc    Get audit logs (OWNER or STAFF with permission)
 * @route   GET /api/admin/audit-logs
 * @access  Private
 */
const getAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, action, entity } = req.query;

  // CRITICAL: Base query with tenant isolation
  const query = shopQuery(req);
  if (action) query.action = action;
  if (entity) query.entity = entity;

  const skip = (page - 1) * limit;

  const logs = await AuditLog.find(query)
    .populate('user', 'name email')
    .sort('-createdAt')
    .limit(Number(limit))
    .skip(skip);

  const total = await AuditLog.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      logs,
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
 * @desc    Update user status (OWNER only)
 * @route   PATCH /api/admin/users/:id/status
 * @access  Private/OWNER
 */
const updateUserStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  
  if (!['active', 'blocked'].includes(status)) {
    throw new AppError('Invalid status. Must be active or blocked', 400);
  }

  // CRITICAL: Find user with tenant isolation
  const user = await User.findOne(shopQuery(req, { _id: req.params.id }));
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Can't block OWNER users
  if (user.role === 'OWNER' && status === 'blocked') {
    throw new AppError('Cannot block OWNER users', 400);
  }

  user.status = status;
  await user.save();

  res.status(200).json({
    success: true,
    message: `User status updated to ${status}`,
    data: { user }
  });
});

/**
 * @desc    Update user role (OWNER only)
 * @route   PATCH /api/admin/users/:id/role
 * @access  Private/OWNER
 */
const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  
  if (!['OWNER', 'STAFF'].includes(role)) {
    throw new AppError('Invalid role. Must be OWNER or STAFF', 400);
  }

  // CRITICAL: Find user with tenant isolation
  const user = await User.findOne(shopQuery(req, { _id: req.params.id }));
  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.role = role;
  await user.save();

  res.status(200).json({
    success: true,
    message: `User role updated to ${role}`,
    data: { user }
  });
});

module.exports = {
  getDashboardStats,
  getAllOrders,
  updateOrderStatus,
  getAllUsers,
  updateUser,
  toggleUserBlock,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  getAuditLogs
};
