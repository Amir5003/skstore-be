const Shop = require('../models/Shop.model');
const User = require('../models/User.model');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');

/**
 * @desc    Create a new shop (shop onboarding)
 * @route   POST /api/shops/create
 * @access  Public (during owner registration)
 */
const createShop = asyncHandler(async (req, res) => {
  const { name, slug, address, contact, gst, agreedToTerms, agreedToSellerAgreement } = req.body;

  // Validate legal agreements
  if (!agreedToTerms || !agreedToSellerAgreement) {
    throw new AppError('You must agree to Terms & Conditions and Seller Agreement', 400);
  }

  // Check if slug already exists
  if (slug) {
    const existingShop = await Shop.findOne({ slug: slug.toLowerCase() });
    if (existingShop) {
      throw new AppError('Shop URL already taken. Please choose another.', 400);
    }
  }

  // Create shop (ownerId will be set after user creation)
  const shop = await Shop.create({
    name,
    slug: slug || undefined, // Will be auto-generated from name if not provided
    ownerId: req.user ? req.user._id : null, // Set later if this is during registration
    address,
    contact,
    gst,
    agreedToTerms,
    agreedToSellerAgreement,
    plan: 'FREE',
    isActive: true
  });

  res.status(201).json({
    success: true,
    message: 'Shop created successfully',
    data: {
      shop: {
        _id: shop._id,
        name: shop.name,
        slug: shop.slug,
        plan: shop.plan,
        enabledModules: shop.enabledModules
      }
    }
  });
});

/**
 * @desc    Get current shop details
 * @route   GET /api/shops/my-shop
 * @access  Private (OWNER/STAFF)
 */
const getMyShop = asyncHandler(async (req, res) => {
  const shop = await Shop.findById(req.shopId)
    .populate('ownerId', 'name email phone')
    .select('-__v');

  if (!shop) {
    throw new AppError('Shop not found', 404);
  }

  if (!shop.isActive) {
    throw new AppError('Shop is suspended', 403);
  }

  res.json({
    success: true,
    data: { shop }
  });
});

/**
 * @desc    Update shop details
 * @route   PUT /api/shops/my-shop
 * @access  Private (OWNER only)
 */
const updateShop = asyncHandler(async (req, res) => {
  const { name, address, contact, gst } = req.body;

  const shop = await Shop.findById(req.shopId);

  if (!shop) {
    throw new AppError('Shop not found', 404);
  }

  // Update allowed fields
  if (name) shop.name = name;
  if (address) shop.address = { ...shop.address, ...address };
  if (contact) shop.contact = { ...shop.contact, ...contact };
  if (gst) shop.gst = { ...shop.gst, ...gst };

  await shop.save();

  res.json({
    success: true,
    message: 'Shop updated successfully',
    data: { shop }
  });
});

/**
 * @desc    Get shop settings (enabled modules, plan)
 * @route   GET /api/shops/settings
 * @access  Private (OWNER/STAFF)
 */
const getShopSettings = asyncHandler(async (req, res) => {
  const shop = await Shop.findById(req.shopId).select('enabledModules plan isActive');

  if (!shop) {
    throw new AppError('Shop not found', 404);
  }

  res.json({
    success: true,
    data: {
      enabledModules: shop.enabledModules,
      plan: shop.plan,
      isActive: shop.isActive
    }
  });
});

/**
 * @desc    Update shop settings (OWNER only)
 * @route   PUT /api/shops/settings
 * @access  Private (OWNER only)
 */
const updateShopSettings = asyncHandler(async (req, res) => {
  const { enabledModules } = req.body;

  const shop = await Shop.findById(req.shopId);

  if (!shop) {
    throw new AppError('Shop not found', 404);
  }

  if (enabledModules) {
    shop.enabledModules = { ...shop.enabledModules, ...enabledModules };
  }

  await shop.save();

  res.json({
    success: true,
    message: 'Shop settings updated',
    data: {
      enabledModules: shop.enabledModules
    }
  });
});

/**
 * @desc    Get shop by slug (public)
 * @route   GET /api/shops/slug/:slug
 * @access  Public
 */
const getShopBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const shop = await Shop.findOne({ slug, isActive: true })
    .select('name slug description contact address isActive plan enabledModules');

  if (!shop) {
    throw new AppError('Shop not found or inactive', 404);
  }

  // Ensure contact and address objects exist even if empty
  const shopData = shop.toObject();
  if (!shopData.contact) {
    shopData.contact = { phone: null, email: null, whatsapp: null };
  }
  if (!shopData.address) {
    shopData.address = { 
      addressLine1: null, 
      addressLine2: null, 
      city: null, 
      state: null, 
      pincode: null, 
      country: 'India' 
    };
  }

  res.json({
    success: true,
    data: {
      shop: shopData
    }
  });
});

module.exports = {
  createShop,
  getMyShop,
  updateShop,
  getShopSettings,
  updateShopSettings,
  getShopBySlug
};
