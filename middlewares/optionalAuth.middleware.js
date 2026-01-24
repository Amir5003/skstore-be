const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

/**
 * Optional Authentication Middleware
 * Tries to authenticate if token is present, but doesn't fail if not
 * Used for routes that support both public and authenticated access
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // If no token, continue without authentication
    if (!token) {
      return next();
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      const user = await User.findById(decoded.id)
        .select('-password')
        .populate('shopId', 'name slug isActive');

      if (user) {
        req.user = user;
      }
    } catch (error) {
      // Invalid token, continue without authentication
      console.log('Optional auth - invalid token, continuing as public');
    }

    next();
  } catch (error) {
    next();
  }
};

module.exports = { optionalAuth };
