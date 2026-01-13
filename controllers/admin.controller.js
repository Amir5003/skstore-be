const Order = require('../models/Order.model');
const User = require('../models/User.model');
const Product = require('../models/Product.model');
const AuditLog = require('../models/AuditLog.model');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { sendOrderStatusEmail, sendOrderStatusWhatsApp } = require('../services/email.service');
const { sendOrderStatusWhatsApp: sendWhatsApp } = require('../services/whatsapp.service');

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/admin/dashboard/stats
 * @access  Private/Admin
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalProducts,
    totalOrders,
    activeProducts,
    pendingOrders,
    revenue
  ] = await Promise.all([
    User.countDocuments(),
    Product.countDocuments(),
    Order.countDocuments(),
    Product.countDocuments({ isActive: true }),
    Order.countDocuments({ orderStatus: 'PLACED' }),
    Order.aggregate([
      { $match: { orderStatus: { $ne: 'CANCELLED' } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ])
  ]);

  // Daily revenue (last 7 days)
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);

  const dailyRevenue = await Order.aggregate([
    {
      $match: {
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

  // Monthly revenue (last 6 months)
  const last6Months = new Date();
  last6Months.setMonth(last6Months.getMonth() - 6);

  const monthlyRevenue = await Order.aggregate([
    {
      $match: {
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

  // Low stock alerts
  const lowStockProducts = await Product.find({
    stock: { $lt: 10 },
    isActive: true
  }).limit(10);

  // Recent orders
  const recentOrders = await Order.find()
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
 * @desc    Get all orders (Admin)
 * @route   GET /api/admin/orders
 * @access  Private/Admin
 */
const getAllOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;

  const query = {};
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
 * @desc    Update order status (Admin)
 * @route   PATCH /api/admin/orders/:id/status
 * @access  Private/Admin
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;

  const validStatuses = ['PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    throw new AppError('Invalid order status', 400);
  }

  const order = await Order.findById(req.params.id);
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
 * @desc    Get all users (Admin)
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, status } = req.query;

  const query = {};
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
 * @desc    Update user (Admin)
 * @route   PUT /api/admin/users/:id
 * @access  Private/Admin
 */
const updateUser = asyncHandler(async (req, res) => {
  const { name, email, phone, role, status } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Update fields
  if (name) user.name = name;
  if (email) user.email = email;
  if (phone) user.phone = phone;
  if (role) user.role = role;
  if (status) user.status = status;

  await user.save();

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: { user }
  });
});

/**
 * @desc    Block/Unblock user (Admin)
 * @route   PATCH /api/admin/users/:id/block
 * @access  Private/Admin
 */
const toggleUserBlock = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Can't block admin users
  if (user.role === 'admin') {
    throw new AppError('Cannot block admin users', 400);
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
 * @desc    Delete user (Soft delete - Admin)
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Can't delete admin users
  if (user.role === 'admin') {
    throw new AppError('Cannot delete admin users', 400);
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
 * @desc    Get audit logs (Admin)
 * @route   GET /api/admin/audit-logs
 * @access  Private/Admin
 */
const getAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, action, entity } = req.query;

  const query = {};
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
 * @desc    Update user status (Admin)
 * @route   PATCH /api/admin/users/:id/status
 * @access  Private/Admin
 */
const updateUserStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  
  if (!['active', 'blocked'].includes(status)) {
    throw new AppError('Invalid status. Must be active or blocked', 400);
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Can't block admin users
  if (user.role === 'admin' && status === 'blocked') {
    throw new AppError('Cannot block admin users', 400);
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
 * @desc    Update user role (Admin)
 * @route   PATCH /api/admin/users/:id/role
 * @access  Private/Admin
 */
const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  
  if (!['user', 'admin'].includes(role)) {
    throw new AppError('Invalid role. Must be user or admin', 400);
  }

  const user = await User.findById(req.params.id);
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
