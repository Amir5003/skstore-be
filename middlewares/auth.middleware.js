const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const Shop = require('../models/Shop.model');

/**
 * Verify JWT token and authenticate user
 * CRITICAL: Extracts shopId and role from token for multi-tenancy
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Please login to access this resource.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // CRITICAL: Validate shopId exists in token
    if (!decoded.shopId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format. Missing shop context.'
      });
    }

    // Get user from token with shop context
    const user = await User.findOne({
      _id: decoded.id,
      shopId: decoded.shopId
    }).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Token is invalid.'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact shop owner.'
      });
    }

    // Verify shop exists and is active
    const shop = await Shop.findById(decoded.shopId);
    if (!shop) {
      return res.status(403).json({
        success: false,
        message: 'Shop not found. Invalid token.'
      });
    }

    if (!shop.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Shop is suspended. Please contact support.'
      });
    }

    // Attach user with shopId and role to request
    req.user = {
      _id: user._id,
      shopId: user.shopId,
      role: user.role,
      name: user.name,
      email: user.email,
      phone: user.phone,
      permissions: user.permissions
    };

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please login again.'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this resource.'
    });
  }
};

/**
 * Authorize user based on roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route.`
      });
    }

    next();
  };
};

/**
 * Optional authentication - doesn't block if not authenticated
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = { protect, authorize, optionalAuth };
