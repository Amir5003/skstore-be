const express = require('express');
const { body } = require('express-validator');
const {
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
} = require('../controllers/admin.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { logAdminAction } = require('../middlewares/auditLog.middleware');
const validate = require('../middlewares/validate.middleware');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect, authorize('admin'));

// Dashboard
router.get('/dashboard/stats', getDashboardStats);

// Orders management
router.get('/orders', getAllOrders);
router.patch(
  '/orders/:id/status',
  body('status').notEmpty().withMessage('Status is required'),
  validate,
  logAdminAction('UPDATE_ORDER_STATUS', 'ORDER'),
  updateOrderStatus
);

// User management
router.get('/users', getAllUsers);
router.put(
  '/users/:id',
  logAdminAction('UPDATE_USER', 'USER'),
  updateUser
);
router.patch(
  '/users/:id/status',
  body('status').isIn(['active', 'blocked']).withMessage('Invalid status'),
  validate,
  logAdminAction('UPDATE_USER_STATUS', 'USER'),
  updateUserStatus
);
router.patch(
  '/users/:id/role',
  body('role').isIn(['user', 'admin']).withMessage('Invalid role'),
  validate,
  logAdminAction('UPDATE_USER_ROLE', 'USER'),
  updateUserRole
);
router.patch(
  '/users/:id/block',
  logAdminAction('BLOCK_USER', 'USER'),
  toggleUserBlock
);
router.delete(
  '/users/:id',
  logAdminAction('DELETE_USER', 'USER'),
  deleteUser
);

// Audit logs
router.get('/audit-logs', getAuditLogs);

module.exports = router;
