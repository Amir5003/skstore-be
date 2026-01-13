const User = require('../models/User.model');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setTokenCookies,
  clearTokenCookies
} = require('../utils/jwt.util');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ 
    $or: [{ email }, { phone }] 
  }).select('+isDeleted');

  if (existingUser && !existingUser.isDeleted) {
    throw new AppError('User with this email or phone already exists', 400);
  }

  // Create user
  const user = await User.create({
    name,
    email,
    phone,
    password
  });

  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Save refresh token to database
  user.refreshToken = refreshToken;
  await user.save();

  // Set cookies
  setTokenCookies(res, accessToken, refreshToken);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      accessToken
    }
  });
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check if user exists
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // Check if user is blocked
  if (user.status === 'blocked') {
    throw new AppError('Your account has been blocked. Please contact support.', 403);
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Save refresh token to database
  user.refreshToken = refreshToken;
  await user.save();

  // Set cookies
  setTokenCookies(res, accessToken, refreshToken);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      accessToken
    }
  });
});

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  // Clear refresh token from database
  await User.findByIdAndUpdate(req.user._id, {
    $unset: { refreshToken: 1 }
  });

  // Clear cookies
  clearTokenCookies(res);

  res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
});

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh
 * @access  Public
 */
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    throw new AppError('Refresh token not found', 401);
  }

  // Verify refresh token
  const decoded = verifyRefreshToken(refreshToken);

  // Find user and verify refresh token
  const user = await User.findById(decoded.id).select('+refreshToken');

  if (!user || user.refreshToken !== refreshToken) {
    throw new AppError('Invalid refresh token', 401);
  }

  // Generate new tokens
  const newAccessToken = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);

  // Update refresh token in database
  user.refreshToken = newRefreshToken;
  await user.save();

  // Set new cookies
  setTokenCookies(res, newAccessToken, newRefreshToken);

  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: {
      accessToken: newAccessToken
    }
  });
});

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('addresses');

  res.status(200).json({
    success: true,
    data: {
      user
    }
  });
});

/**
 * @desc    Update password
 * @route   PUT /api/auth/password
 * @access  Private
 */
const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Verify current password
  const isPasswordValid = await user.comparePassword(currentPassword);

  if (!isPasswordValid) {
    throw new AppError('Current password is incorrect', 401);
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Clear all sessions by removing refresh token
  user.refreshToken = undefined;
  await user.save();

  // Clear cookies
  clearTokenCookies(res);

  res.status(200).json({
    success: true,
    message: 'Password updated successfully. Please login again.'
  });
});

module.exports = {
  register,
  login,
  logout,
  refresh,
  getMe,
  updatePassword
};
