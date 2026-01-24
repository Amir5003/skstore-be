const User = require('../models/User.model');
const Shop = require('../models/Shop.model');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} = require('../utils/jwt.util');

/**
 * @desc    Register shop owner (shop creation + owner account)
 * @route   POST /api/auth/register-owner
 * @access  Public
 */
const registerOwner = asyncHandler(async (req, res) => {
  const {
    // Shop details
    shopName,
    shopSlug,
    shopAddress,
    shopContact,
    shopGst,
    // Owner details
    ownerName,
    ownerEmail,
    ownerPhone,
    ownerPassword,
    // Legal agreements
    agreedToTerms,
    agreedToSellerAgreement,
    agreedToProhibitedItems
  } = req.body;

  // Validate legal agreements
  if (!agreedToTerms || !agreedToSellerAgreement || !agreedToProhibitedItems) {
    throw new AppError('You must agree to all terms and conditions', 400);
  }

  // Check if slug is already taken
  if (shopSlug) {
    const existingShop = await Shop.findOne({ slug: shopSlug.toLowerCase() });
    if (existingShop) {
      throw new AppError('Shop URL already taken. Please choose another.', 400);
    }
  }

  // Check if owner email already exists (across all shops)
  const existingUser = await User.findOne({ email: ownerEmail }).select('+isDeleted');
  if (existingUser && !existingUser.isDeleted) {
    throw new AppError('Email already registered. Please login or use different email.', 400);
  }

  // TRANSACTION: Create shop and owner together
  // Step 1: Create shop (without ownerId first)
  const shop = await Shop.create({
    name: shopName,
    slug: shopSlug || undefined,
    address: shopAddress,
    contact: shopContact,
    gst: shopGst,
    agreedToTerms,
    agreedToSellerAgreement,
    agreedToProhibitedItems,
    plan: 'FREE',
    isActive: true,
    ownerId: null // Will be updated after user creation
  });

  try {
    // Step 2: Create owner user account
    const owner = await User.create({
      shopId: shop._id,
      name: ownerName,
      email: ownerEmail,
      phone: ownerPhone,
      password: ownerPassword,
      role: 'OWNER',
      isActive: true
    });

    // Step 3: Update shop with ownerId
    shop.ownerId = owner._id;
    await shop.save();

    // Generate tokens with shopId and role
    const accessToken = generateAccessToken(owner._id, shop._id, 'OWNER');
    const refreshToken = generateRefreshToken(owner._id, shop._id, 'OWNER');

    // Save refresh token
    owner.refreshToken = refreshToken;
    await owner.save();

    res.status(201).json({
      success: true,
      message: 'Shop created successfully! Welcome aboard.',
      data: {
        user: {
          id: owner._id,
          name: owner.name,
          email: owner.email,
          phone: owner.phone,
          role: owner.role
        },
        shop: {
          id: shop._id,
          name: shop.name,
          slug: shop.slug,
          plan: shop.plan,
          enabledModules: shop.enabledModules
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    // Rollback: Delete shop if user creation fails
    await Shop.findByIdAndDelete(shop._id);
    throw error;
  }
});

/**
 * @desc    Login (owner or staff)
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password, shopSlug } = req.body;

  // Find shop by slug
  if (!shopSlug) {
    throw new AppError('Shop URL is required', 400);
  }

  const shop = await Shop.findOne({ slug: shopSlug.toLowerCase() });
  if (!shop) {
    throw new AppError('Shop not found', 404);
  }

  if (!shop.isActive) {
    throw new AppError('This shop is suspended. Please contact support.', 403);
  }

  // Find user in this shop
  const user = await User.findOne({
    shopId: shop._id,
    email: email
  }).select('+password');

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // Check if user is active
  if (!user.isActive) {
    throw new AppError('Your account has been deactivated. Please contact shop owner.', 403);
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  // Generate tokens with shopId and role
  const accessToken = generateAccessToken(user._id, shop._id, user.role);
  const refreshToken = generateRefreshToken(user._id, shop._id, user.role);

  // Save refresh token
  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        permissions: user.permissions
      },
      shop: {
        id: shop._id,
        name: shop.name,
        slug: shop.slug,
        plan: shop.plan,
        enabledModules: shop.enabledModules
      },
      accessToken,
      refreshToken
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
  const user = await User.findById(req.user._id);
  if (user) {
    user.refreshToken = null;
    await user.save();
  }

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh
 * @access  Public
 */
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AppError('Refresh token is required', 400);
  }

  // Verify refresh token
  const decoded = verifyRefreshToken(refreshToken);

  // Find user with matching refresh token
  const user = await User.findOne({
    _id: decoded.id,
    shopId: decoded.shopId
  }).select('+refreshToken');

  if (!user || user.refreshToken !== refreshToken) {
    throw new AppError('Invalid refresh token', 401);
  }

  // Check if user and shop are still active
  if (!user.isActive) {
    throw new AppError('Account is deactivated', 403);
  }

  const shop = await Shop.findById(decoded.shopId);
  if (!shop || !shop.isActive) {
    throw new AppError('Shop is not active', 403);
  }

  // Generate new access token
  const newAccessToken = generateAccessToken(user._id, decoded.shopId, user.role);

  res.status(200).json({
    success: true,
    data: {
      accessToken: newAccessToken
    }
  });
});

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select('-password -refreshToken')
    .populate('shopId', 'name slug plan enabledModules');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    data: { user }
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

  res.status(200).json({
    success: true,
    message: 'Password updated successfully. Please login again.'
  });
});

/**
 * @desc    Invite staff member (OWNER only)
 * @route   POST /api/auth/invite-staff
 * @access  Private (OWNER only)
 */
const inviteStaff = asyncHandler(async (req, res) => {
  const { name, email, phone, password, permissions } = req.body;

  // Only OWNER can invite staff
  if (req.user.role !== 'OWNER') {
    throw new AppError('Only shop owner can invite staff members', 403);
  }

  // Check if email already exists in this shop
  const existingUser = await User.findOne({
    shopId: req.user.shopId,
    email: email
  });

  if (existingUser) {
    throw new AppError('User with this email already exists in your shop', 400);
  }

  // Create staff user
  const staff = await User.create({
    shopId: req.user.shopId,
    name,
    email,
    phone,
    password,
    role: 'STAFF',
    permissions: permissions || {
      canManageProducts: false,
      canManageOrders: false,
      canManageCustomers: false,
      canViewReports: false
    },
    isActive: true
  });

  res.status(201).json({
    success: true,
    message: 'Staff member invited successfully',
    data: {
      staff: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        role: staff.role,
        permissions: staff.permissions
      }
    }
  });
});

/**
 * @desc    Register customer (public)
 * @route   POST /api/auth/register-customer
 * @access  Public
 */
const registerCustomer = asyncHandler(async (req, res) => {
  const { name, email, phone, password, shopSlug } = req.body;

  // Find shop by slug
  const shop = await Shop.findOne({ slug: shopSlug, isActive: true });
  if (!shop) {
    throw new AppError('Shop not found or inactive', 404);
  }

  // Check if customer already exists for this shop
  const existingUser = await User.findOne({
    shopId: shop._id,
    email: email.toLowerCase()
  });

  if (existingUser) {
    throw new AppError('Customer with this email already exists', 400);
  }

  // Create customer user
  const customer = await User.create({
    shopId: shop._id,
    name,
    email: email.toLowerCase(),
    phone,
    password,
    role: 'CUSTOMER',
    isActive: true
  });

  // Generate tokens
  const accessToken = generateAccessToken(customer._id, shop._id, 'CUSTOMER');
  const refreshToken = generateRefreshToken(customer._id);

  // Set refresh token cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.status(201).json({
    success: true,
    message: 'Customer registered successfully',
    data: {
      user: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        role: customer.role,
        shopId: {
          _id: shop._id,
          name: shop.name,
          slug: shop.slug
        }
      },
      accessToken,
      refreshToken
    }
  });
});

module.exports = {
  registerOwner,
  login,
  logout,
  refresh,
  getMe,
  updatePassword,
  inviteStaff,
  registerCustomer
};
