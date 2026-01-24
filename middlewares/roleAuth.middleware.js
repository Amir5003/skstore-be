const { AppError } = require('./error.middleware');

/**
 * Role-Based Authorization Middleware
 * 
 * Enforces OWNER vs STAFF permissions
 * Must be used after auth and tenantIsolation middleware
 */

/**
 * Check if user has OWNER role
 */
const requireOwner = () => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (req.user.role !== 'OWNER') {
      return next(new AppError('Access denied. Only shop owner can perform this action.', 403));
    }

    next();
  };
};

/**
 * Check if user has either OWNER or STAFF role
 */
const requireStaff = () => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!['OWNER', 'STAFF'].includes(req.user.role)) {
      return next(new AppError('Access denied. Invalid role.', 403));
    }

    next();
  };
};

/**
 * Check specific permission for STAFF users
 * OWNER always has all permissions
 */
const requirePermission = (permissionName) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    // Owner has all permissions
    if (req.user.role === 'OWNER') {
      return next();
    }

    // Check staff permission
    if (req.user.role === 'STAFF') {
      if (!req.user.permissions || !req.user.permissions[permissionName]) {
        return next(new AppError(`Access denied. Missing permission: ${permissionName}`, 403));
      }
      return next();
    }

    return next(new AppError('Access denied. Invalid role.', 403));
  };
};

/**
 * Permission names for easy reference
 */
const PERMISSIONS = {
  MANAGE_PRODUCTS: 'canManageProducts',
  MANAGE_ORDERS: 'canManageOrders',
  MANAGE_CUSTOMERS: 'canManageCustomers',
  VIEW_REPORTS: 'canViewReports'
};

module.exports = {
  requireOwner,
  requireStaff,
  requirePermission,
  PERMISSIONS
};
