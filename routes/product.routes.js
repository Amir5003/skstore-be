const express = require('express');
const { body } = require('express-validator');
const {
  getProducts,
  getProduct,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
  getCategories
} = require('../controllers/product.controller');
const { protect } = require('../middlewares/auth.middleware');
const { tenantIsolation } = require('../middlewares/tenantIsolation.middleware');
const { requirePermission, PERMISSIONS } = require('../middlewares/roleAuth.middleware');
const { logAdminAction } = require('../middlewares/auditLog.middleware');
const validate = require('../middlewares/validate.middleware');
const upload = require('../utils/upload.util');
const { optionalAuth } = require('../middlewares/optionalAuth.middleware');

const router = express.Router();

// Public routes with optional authentication
// If authenticated, uses JWT shopId. If not, requires shopSlug query parameter
router.get('/', optionalAuth, getProducts);
router.get('/categories/list', optionalAuth, getCategories);
router.get('/slug/:slug', optionalAuth, getProductBySlug);
router.get('/:id', optionalAuth, getProduct);

// Protected routes - require authentication and tenant isolation
router.use(protect, tenantIsolation);

// Validation rules
const productValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Product name is required')
    .isLength({ max: 200 }).withMessage('Product name cannot exceed 200 characters'),
  body('description')
    .trim()
    .notEmpty().withMessage('Product description is required'),
  body('price')
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('stock')
    .isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('category')
    .notEmpty().withMessage('Category is required')
];

// Routes requiring product management permission
router.post(
  '/',
  requirePermission(PERMISSIONS.MANAGE_PRODUCTS),
  upload.array('images', 5),
  productValidation,
  validate,
  logAdminAction('CREATE_PRODUCT', 'PRODUCT'),
  createProduct
);

router.put(
  '/:id',
  requirePermission(PERMISSIONS.MANAGE_PRODUCTS),
  upload.array('images', 5),
  logAdminAction('UPDATE_PRODUCT', 'PRODUCT'),
  updateProduct
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.MANAGE_PRODUCTS),
  logAdminAction('DELETE_PRODUCT', 'PRODUCT'),
  deleteProduct
);

router.patch(
  '/:id/toggle-active',
  requirePermission(PERMISSIONS.MANAGE_PRODUCTS),
  logAdminAction('ACTIVATE_PRODUCT', 'PRODUCT'),
  toggleProductStatus
);

module.exports = router;
