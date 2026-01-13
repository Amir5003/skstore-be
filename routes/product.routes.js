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
const { protect, authorize, optionalAuth } = require('../middlewares/auth.middleware');
const { logAdminAction } = require('../middlewares/auditLog.middleware');
const validate = require('../middlewares/validate.middleware');
const upload = require('../utils/upload.util');

const router = express.Router();

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

// Public routes
router.get('/', optionalAuth, getProducts);
router.get('/categories/list', getCategories);
router.get('/slug/:slug', optionalAuth, getProductBySlug);
router.get('/:id', optionalAuth, getProduct);

// Admin routes
router.post(
  '/',
  protect,
  authorize('admin'),
  upload.array('images', 5),
  productValidation,
  validate,
  logAdminAction('CREATE_PRODUCT', 'PRODUCT'),
  createProduct
);

router.put(
  '/:id',
  protect,
  authorize('admin'),
  upload.array('images', 5),
  logAdminAction('UPDATE_PRODUCT', 'PRODUCT'),
  updateProduct
);

router.delete(
  '/:id',
  protect,
  authorize('admin'),
  logAdminAction('DELETE_PRODUCT', 'PRODUCT'),
  deleteProduct
);

router.patch(
  '/:id/toggle-active',
  protect,
  authorize('admin'),
  logAdminAction('ACTIVATE_PRODUCT', 'PRODUCT'),
  toggleProductStatus
);

module.exports = router;
