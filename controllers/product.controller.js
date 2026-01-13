const Product = require('../models/Product.model');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { uploadMultipleToCloudinary, deleteFromCloudinary } = require('../services/cloudinary.service');

/**
 * @desc    Get all products (with filters, search, sort, pagination)
 * @route   GET /api/products
 * @access  Public
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
    isActive
  } = req.query;

  // Build query
  const query = {};

  if (category) query.category = category;
  if (search) query.$text = { $search: search };
  if (minPrice || maxPrice) {
    query.finalPrice = {};
    if (minPrice) query.finalPrice.$gte = Number(minPrice);
    if (maxPrice) query.finalPrice.$lte = Number(maxPrice);
  }
  
  // Only show active products to non-admin users
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  } else if (!req.user || req.user.role !== 'admin') {
    query.isActive = true;
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
 * @access  Public
 */
const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Check if product is active (unless admin)
  if (!product.isActive && (!req.user || req.user.role !== 'admin')) {
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
 * @access  Public
 */
const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  if (!product.isActive && (!req.user || req.user.role !== 'admin')) {
    throw new AppError('Product not found', 404);
  }

  res.status(200).json({
    success: true,
    data: { product }
  });
});

/**
 * @desc    Create product (Admin only)
 * @route   POST /api/products
 * @access  Private/Admin
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

  // Create product
  const product = await Product.create({
    name,
    description,
    price,
    discount,
    stock,
    category,
    brand,
    specifications,
    images: productImages,
    createdBy: req.user._id
  });

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: { product }
  });
});

/**
 * @desc    Update product (Admin only)
 * @route   PUT /api/products/:id
 * @access  Private/Admin
 */
const updateProduct = asyncHandler(async (req, res) => {
  let product = await Product.findById(req.params.id);

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

  // Update product
  product = await Product.findByIdAndUpdate(
    req.params.id,
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
 * @desc    Delete product (Soft delete - Admin only)
 * @route   DELETE /api/products/:id
 * @access  Private/Admin
 */
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

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
 * @desc    Toggle product active status (Admin only)
 * @route   PATCH /api/products/:id/toggle-active
 * @access  Private/Admin
 */
const toggleProductStatus = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

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
