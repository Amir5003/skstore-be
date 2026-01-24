const Product = require('../models/Product.model');
const Shop = require('../models/Shop.model');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { shopQuery } = require('../middlewares/tenantIsolation.middleware');
const { uploadMultipleToCloudinary, deleteFromCloudinary } = require('../services/cloudinary.service');

/**
 * @desc    Get all products (with filters, search, sort, pagination)
 * @route   GET /api/products
 * @access  Public (with shopSlug) or Private (with auth)
 */
const getProducts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 12,
    category,
    search,
    minPrice,
    maxPrice,
    sort = '-createdAt',
    isActive,
    shopSlug // For public access
  } = req.query;

  let query = {};

  // CRITICAL: Determine shop context
  if (req.user && req.user.shopId) {
    // Authenticated user - manually add shopId (tenantIsolation middleware not applied on public routes)
    query.shopId = req.user.shopId._id || req.user.shopId;
    
    // Only show active products to STAFF users
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    } else if (req.user.role === 'STAFF') {
      query.isActive = true;
    }
  } else if (shopSlug) {
    // Public access - find shop by slug
    const shop = await Shop.findOne({ slug: shopSlug, isActive: true });
    if (!shop) {
      throw new AppError('Shop not found or inactive', 404);
    }
    query.shopId = shop._id;
    query.isActive = true; // Only show active products to public
  } else {
    // No authentication and no shopSlug - this is an error
    throw new AppError('Authentication or shop slug is required', 400);
  }

  if (category) query.category = category;
  if (search) query.$text = { $search: search };
  if (minPrice || maxPrice) {
    query.finalPrice = {};
    if (minPrice) query.finalPrice.$gte = Number(minPrice);
    if (maxPrice) query.finalPrice.$lte = Number(maxPrice);
  }

  // Pagination
  const skip = (page - 1) * limit;

  // Execute query
  const products = await Product.find(query)
    .sort(sort)
    .limit(Number(limit))
    .skip(skip);

  // Get total count
  const total = await Product.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      products,
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
 * @desc    Get single product
 * @route   GET /api/products/:id
 * @access  Private
 */
const getProduct = asyncHandler(async (req, res) => {
  // CRITICAL: Filter by shopId for tenant isolation
  const product = await Product.findOne(shopQuery(req, { _id: req.params.id }));

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Check if product is active (unless OWNER)
  if (!product.isActive && req.user.role !== 'OWNER') {
    throw new AppError('Product not found', 404);
  }

  res.status(200).json({
    success: true,
    data: { product }
  });
});

/**
 * @desc    Get product by slug
 * @route   GET /api/products/slug/:slug
 * @access  Public (optionalAuth)
 */
const getProductBySlug = asyncHandler(async (req, res) => {
  // Fetch product by slug (no tenant isolation - slug is globally unique)
  const product = await Product.findOne({ slug: req.params.slug });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Only show inactive products to shop owner/staff
  if (!product.isActive && (!req.user || req.user.role === 'CUSTOMER')) {
    throw new AppError('Product not found', 404);
  }

  res.status(200).json({
    success: true,
    data: { product }
  });
});

/**
 * @desc    Create product (OWNER or STAFF with permission)
 * @route   POST /api/products
 * @access  Private
 */
const createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, discount, stock, category, brand, specifications, images } = req.body;

  // Handle images - support both file uploads and URL strings
  let productImages = [];
  if (req.files && req.files.length > 0) {
    // Upload files to Cloudinary
    productImages = await uploadMultipleToCloudinary(req.files, 'products');
  } else if (images && Array.isArray(images)) {
    // Use provided image URLs
    productImages = images.filter(img => img && img.trim());
  }

  // CRITICAL: Create product with shopId for tenant isolation
  const product = await Product.create({
    shopId: req.shopId, // CRITICAL: Must include shopId
    name,
    description,
    price,
    discount,
    stock,
    category,
    brand,
    specifications,
    images: productImages
  });

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: { product }
  });
});

/**
 * @desc    Update product (OWNER or STAFF with permission)
 * @route   PUT /api/products/:id
 * @access  Private
 */
const updateProduct = asyncHandler(async (req, res) => {
  // CRITICAL: Find product with tenant isolation
  let product = await Product.findOne(shopQuery(req, { _id: req.params.id }));

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Handle images - support both file uploads and URL strings
  if (req.files && req.files.length > 0) {
    // Upload new images to Cloudinary
    const newImages = await uploadMultipleToCloudinary(req.files, 'products');
    
    // Optionally delete old images from Cloudinary if they have publicId
    if (req.body.deleteOldImages === 'true' && product.images.length > 0) {
      for (const image of product.images) {
        if (typeof image === 'object' && image.publicId) {
          await deleteFromCloudinary(image.publicId).catch(err => 
            console.error('Error deleting image:', err)
          );
        }
      }
      req.body.images = newImages;
    } else {
      req.body.images = [...product.images, ...newImages];
    }
  } else if (req.body.images && Array.isArray(req.body.images)) {
    // Use provided image URLs
    req.body.images = req.body.images.filter(img => img && (typeof img === 'string' ? img.trim() : true));
  }

  // Update product with tenant isolation
  product = await Product.findOneAndUpdate(
    shopQuery(req, { _id: req.params.id }),
    { ...req.body, updatedBy: req.user._id },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Product updated successfully',
    data: { product }
  });
});

/**
 * @desc    Delete product (Soft delete - OWNER or STAFF with permission)
 * @route   DELETE /api/products/:id
 * @access  Private
 */
const deleteProduct = asyncHandler(async (req, res) => {
  // CRITICAL: Find product with tenant isolation
  const product = await Product.findOne(shopQuery(req, { _id: req.params.id }));

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Soft delete
  product.isDeleted = true;
  product.deletedAt = new Date();
  product.isActive = false;
  await product.save();

  res.status(200).json({
    success: true,
    message: 'Product deleted successfully'
  });
});

/**
 * @desc    Toggle product active status (OWNER or STAFF with permission)
 * @route   PATCH /api/products/:id/toggle-active
 * @access  Private
 */
const toggleProductStatus = asyncHandler(async (req, res) => {
  // CRITICAL: Find product with tenant isolation
  const product = await Product.findOne(shopQuery(req, { _id: req.params.id }));

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  product.isActive = !product.isActive;
  await product.save();

  res.status(200).json({
    success: true,
    message: `Product ${product.isActive ? 'activated' : 'deactivated'} successfully`,
    data: { product }
  });
});

/**
 * @desc    Get product categories
 * @route   GET /api/products/categories/list
 * @access  Public
 */
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Product.distinct('category');

  res.status(200).json({
    success: true,
    data: { categories }
  });
});

module.exports = {
  getProducts,
  getProduct,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
  getCategories
};
