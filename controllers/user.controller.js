const User = require('../models/User.model');
const Order = require('../models/Order.model');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { shopQuery } = require('../middlewares/tenantIsolation.middleware');

/**
 * @desc    Get user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
const getProfile = asyncHandler(async (req, res) => {
  // CRITICAL: Find user with tenant isolation
  const user = await User.findOne(shopQuery(req, { _id: req.user._id })).populate('shopId', 'name slug plan enabledModules');

  res.status(200).json({
    success: true,
    data: { user }
  });
});

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;

  // CRITICAL: Find user with tenant isolation
  const user = await User.findOne(shopQuery(req, { _id: req.user._id }));

  if (name) user.name = name;
  if (phone) user.phone = phone;

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: { user }
  });
});

/**
 * @desc    Add address
 * @route   POST /api/users/addresses
 * @access  Private
 */
const addAddress = asyncHandler(async (req, res) => {
  // CRITICAL: Find user with tenant isolation
  const user = await User.findOne(shopQuery(req, { _id: req.user._id }));

  // If this is the first address or marked as default, set it as default
  if (req.body.isDefault || user.addresses.length === 0) {
    user.addresses.forEach(addr => addr.isDefault = false);
    req.body.isDefault = true;
  }

  user.addresses.push(req.body);
  await user.save();

  res.status(201).json({
    success: true,
    message: 'Address added successfully',
    data: { user }
  });
});

/**
 * @desc    Update address
 * @route   PUT /api/users/addresses/:addressId
 * @access  Private
 */
const updateAddress = asyncHandler(async (req, res) => {
  // CRITICAL: Find user with tenant isolation
  const user = await User.findOne(shopQuery(req, { _id: req.user._id }));
  const address = user.addresses.id(req.params.addressId);

  if (!address) {
    throw new AppError('Address not found', 404);
  }

  // Update address fields
  Object.assign(address, req.body);

  // If marked as default, unset other defaults
  if (req.body.isDefault) {
    user.addresses.forEach(addr => {
      if (addr._id.toString() !== req.params.addressId) {
        addr.isDefault = false;
      }
    });
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Address updated successfully',
    data: { user }
  });
});

/**
 * @desc    Delete address
 * @route   DELETE /api/users/addresses/:addressId
 * @access  Private
 */
const deleteAddress = asyncHandler(async (req, res) => {
  // CRITICAL: Find user with tenant isolation
  const user = await User.findOne(shopQuery(req, { _id: req.user._id }));
  
  user.addresses = user.addresses.filter(
    addr => addr._id.toString() !== req.params.addressId
  );

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Address deleted successfully',
    data: { user }
  });
});

/**
 * @desc    Get order history
 * @route   GET /api/users/orders
 * @access  Private
 */
const getOrderHistory = asyncHandler(async (req, res) => {
  // CRITICAL: Find orders with tenant isolation
  const orders = await Order.find(shopQuery(req, { user: req.user._id }))
    .sort('-createdAt')
    .limit(50);

  res.status(200).json({
    success: true,
    data: { orders }
  });
});

module.exports = {
  getProfile,
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  getOrderHistory
};
