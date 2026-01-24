const Customer = require('../models/Customer.model');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { shopQuery } = require('../middlewares/tenantIsolation.middleware');

/**
 * @desc    Get all customers (OWNER or STAFF with permission)
 * @route   GET /api/customers
 * @access  Private
 */
const getCustomers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;

  // CRITICAL: Build query with tenant isolation
  const query = shopQuery(req);
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;

  const customers = await Customer.find(query)
    .sort('-createdAt')
    .limit(Number(limit))
    .skip(skip);

  const total = await Customer.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      customers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * @desc    Get single customer
 * @route   GET /api/customers/:id
 * @access  Private
 */
const getCustomer = asyncHandler(async (req, res) => {
  // CRITICAL: Find customer with tenant isolation
  const customer = await Customer.findOne(shopQuery(req, { _id: req.params.id }));

  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  res.status(200).json({
    success: true,
    data: { customer }
  });
});

/**
 * @desc    Create customer (OWNER or STAFF with permission)
 * @route   POST /api/customers
 * @access  Private
 */
const createCustomer = asyncHandler(async (req, res) => {
  const { name, email, phone, address, notes } = req.body;

  // CRITICAL: Create customer with shopId
  const customer = await Customer.create({
    shopId: req.shopId,
    name,
    email,
    phone,
    address,
    notes
  });

  res.status(201).json({
    success: true,
    message: 'Customer created successfully',
    data: { customer }
  });
});

/**
 * @desc    Update customer (OWNER or STAFF with permission)
 * @route   PUT /api/customers/:id
 * @access  Private
 */
const updateCustomer = asyncHandler(async (req, res) => {
  const { name, email, phone, address, notes } = req.body;

  // CRITICAL: Find and update customer with tenant isolation
  const customer = await Customer.findOneAndUpdate(
    shopQuery(req, { _id: req.params.id }),
    { name, email, phone, address, notes },
    { new: true, runValidators: true }
  );

  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Customer updated successfully',
    data: { customer }
  });
});

/**
 * @desc    Delete customer (Soft delete - OWNER or STAFF with permission)
 * @route   DELETE /api/customers/:id
 * @access  Private
 */
const deleteCustomer = asyncHandler(async (req, res) => {
  // CRITICAL: Find customer with tenant isolation
  const customer = await Customer.findOne(shopQuery(req, { _id: req.params.id }));

  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  // Soft delete
  customer.isDeleted = true;
  customer.deletedAt = new Date();
  await customer.save();

  res.status(200).json({
    success: true,
    message: 'Customer deleted successfully'
  });
});

/**
 * @desc    Get customer order history
 * @route   GET /api/customers/:id/orders
 * @access  Private
 */
const getCustomerOrders = asyncHandler(async (req, res) => {
  const Order = require('../models/Order.model');

  // CRITICAL: Verify customer belongs to shop
  const customer = await Customer.findOne(shopQuery(req, { _id: req.params.id }));
  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  // CRITICAL: Find orders with tenant isolation
  const orders = await Order.find(shopQuery(req, { customer: req.params.id }))
    .sort('-createdAt')
    .limit(50);

  res.status(200).json({
    success: true,
    data: { orders }
  });
});

module.exports = {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerOrders
};
