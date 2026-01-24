const express = require('express');
const { body } = require('express-validator');
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require('../controllers/cart.controller');
const { protect } = require('../middlewares/auth.middleware');
const { tenantIsolation } = require('../middlewares/tenantIsolation.middleware');
const validate = require('../middlewares/validate.middleware');

const router = express.Router();

// All cart routes require authentication and tenant isolation
router.use(protect, tenantIsolation);

// Validation rules
const addToCartValidation = [
  body('productId')
    .notEmpty().withMessage('Product ID is required')
    .isMongoId().withMessage('Invalid product ID'),
  body('quantity')
    .optional()
    .isInt({ min: 1 }).withMessage('Quantity must be at least 1')
];

const updateCartValidation = [
  body('quantity')
    .isInt({ min: 1 }).withMessage('Quantity must be at least 1')
];

// Routes
router.get('/', getCart);
router.post('/items', addToCartValidation, validate, addToCart);
router.put('/items/:productId', updateCartValidation, validate, updateCartItem);
router.delete('/items/:productId', removeFromCart);
router.delete('/', clearCart);

module.exports = router;
