const AuditLog = require('../models/AuditLog.model');

/**
 * Middleware to log admin actions (with tenant isolation)
 */
const logAdminAction = (action, entity) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json;

    // Override json method to log after successful response
    res.json = function(data) {
      // Only log if action was successful
      if (data.success) {
        // CRITICAL: Log with shopId for tenant isolation
        AuditLog.create({
          shopId: req.shopId, // CRITICAL: Include shopId
          user: req.user._id,
          action,
          entity,
          entityId: data.data?._id || req.params.id || null,
          details: {
            method: req.method,
            path: req.originalUrl,
            body: req.body,
            params: req.params
          },
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent')
        }).catch(err => {
          console.error('Error logging admin action:', err);
        });
      }

      // Call original json method
      return originalJson.call(this, data);
    };

    next();
  };
};

module.exports = { logAdminAction };
