const express = require('express');
const { body } = require('express-validator');
const {
  getMyShop,
  updateShop,
  getShopSettings,
  updateShopSettings,
  getShopBySlug
} = require('../controllers/shop.controller');
const { protect } = require('../middlewares/auth.middleware');
const { tenantIsolation } = require('../middlewares/tenantIsolation.middleware');
const { requireOwner } = require('../middlewares/roleAuth.middleware');
const validate = require('../middlewares/validate.middleware');

const router = express.Router();

// Public routes
router.get('/slug/:slug', getShopBySlug);

// Protected routes - require authentication and tenant isolation
router.use(protect, tenantIsolation);

// Validation rules
const updateShopValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Shop name must be between 2 and 100 characters')
];

// Routes
router.get('/my-shop', getMyShop);
router.get('/settings', getShopSettings);

// Owner-only routes
router.put('/my-shop', requireOwner, updateShopValidation, validate, updateShop);
router.put('/settings', requireOwner, updateShopSettings);

module.exports = router;
