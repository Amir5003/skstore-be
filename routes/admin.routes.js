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
const { protect } = require('../middlewares/auth.middleware');
const { tenantIsolation } = require('../middlewares/tenantIsolation.middleware');
const { requireOwner, requirePermission, PERMISSIONS } = require('../middlewares/roleAuth.middleware');
const { logAdminAction } = require('../middlewares/auditLog.middleware');
const validate = require('../middlewares/validate.middleware');

const router = express.Router();

// All admin routes require authentication and tenant isolation
router.use(protect, tenantIsolation);

// Dashboard (accessible by OWNER and STAFF with VIEW_REPORTS permission)
router.get('/dashboard/stats', requirePermission(PERMISSIONS.VIEW_REPORTS), getDashboardStats);

// Orders management (accessible by OWNER and STAFF with MANAGE_ORDERS permission)
router.get('/orders', requirePermission(PERMISSIONS.MANAGE_ORDERS), getAllOrders);
router.patch(
  '/orders/:id/status',
  requirePermission(PERMISSIONS.MANAGE_ORDERS),
  body('status').notEmpty().withMessage('Status is required'),
  validate,
  logAdminAction('UPDATE_ORDER_STATUS', 'ORDER'),
  updateOrderStatus
);

// User management (OWNER only)
router.get('/users', requireOwner(), getAllUsers);
router.put(
  '/users/:id',
  requireOwner(),
  logAdminAction('UPDATE_USER', 'USER'),
  updateUser
);
router.patch(
  '/users/:id/status',
  requireOwner(),
  body('status').isIn(['active', 'blocked']).withMessage('Invalid status'),
  validate,
  logAdminAction('UPDATE_USER_STATUS', 'USER'),
  updateUserStatus
);
router.patch(
  '/users/:id/role',
  requireOwner(),
  body('role').isIn(['OWNER', 'STAFF']).withMessage('Invalid role'),
  validate,
  logAdminAction('UPDATE_USER_ROLE', 'USER'),
  updateUserRole
);
router.patch(
  '/users/:id/block',
  requireOwner(),
  logAdminAction('BLOCK_USER', 'USER'),
  toggleUserBlock
);
router.delete(
  '/users/:id',
  requireOwner(),
  logAdminAction('DELETE_USER', 'USER'),
  deleteUser
);

// Audit logs (accessible by OWNER and STAFF with VIEW_REPORTS permission)
router.get('/audit-logs', requirePermission(PERMISSIONS.VIEW_REPORTS), getAuditLogs);

module.exports = router;
