const { AppError } = require('./error.middleware');

/**
 * CRITICAL: Tenant Isolation Middleware
 * 
 * This middleware enforces multi-tenant data isolation.
 * It MUST be applied to all routes that access tenant data.
 * 
 * Security Rules:
 * 1. shopId is NEVER sent from frontend
 * 2. shopId is ALWAYS derived from authenticated user's token
 * 3. All database queries MUST filter by shopId
 * 4. Violation of these rules is a SECURITY BUG
 * 
 * Usage: Apply after auth.middleware on protected routes
 */

const tenantIsolation = (req, res, next) => {
  // This middleware must run after auth middleware
  if (!req.user) {
    return next(new AppError('Authentication required before tenant isolation', 401));
  }

  // Extract shopId from authenticated user
  const shopId = req.user.shopId;

  if (!shopId) {
    return next(new AppError('User does not belong to any shop. Invalid account state.', 403));
  }

  // CRITICAL: Attach shopId to request object
  // This MUST be used in all database queries
  req.shopId = shopId;

  // Also attach full shop context (will be populated if needed)
  req.shop = {
    _id: shopId
  };

  next();
};

/**
 * Validate that shopId exists in request
 * Use this in controller functions as a safety check
 */
const requireShopId = (req) => {
  if (!req.shopId) {
    throw new AppError('Tenant isolation not enforced. This is a security bug.', 500);
  }
  return req.shopId;
};

/**
 * Helper to build base query with shopId
 * Use this to start all database queries
 */
const shopQuery = (req, additionalFilters = {}) => {
  if (!req.shopId) {
    throw new AppError('Tenant isolation not enforced. This is a security bug.', 500);
  }
  
  return {
    shopId: req.shopId,
    ...additionalFilters
  };
};

module.exports = {
  tenantIsolation,
  requireShopId,
  shopQuery
};
