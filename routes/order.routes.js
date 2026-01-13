const express = require('express');
const { body } = require('express-validator');
const {
  createOrder,
  getMyOrders,
  getOrder,
  cancelOrder,
  downloadInvoice
} = require('../controllers/order.controller');
const { protect } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');

const router = express.Router();

// All order routes require authentication
router.use(protect);

// Validation rules
const createOrderValidation = [
  body('shippingAddress.fullName')
    .trim()
    .notEmpty().withMessage('Full name is required'),
  body('shippingAddress.phone')
    .trim()
    .notEmpty().withMessage('Phone is required'),
  body('shippingAddress.addressLine1')
    .trim()
    .notEmpty().withMessage('Address is required'),
  body('shippingAddress.city')
    .trim()
    .notEmpty().withMessage('City is required'),
  body('shippingAddress.state')
    .trim()
    .notEmpty().withMessage('State is required'),
  body('shippingAddress.pincode')
    .trim()
    .notEmpty().withMessage('Pincode is required'),
  body('shippingAddress.country')
    .trim()
    .notEmpty().withMessage('Country is required')
];

// Routes
router.post('/', createOrderValidation, validate, createOrder);
router.get('/', getMyOrders);
router.get('/:id', getOrder);
router.patch('/:id/cancel', cancelOrder);
router.get('/:id/invoice', downloadInvoice);

module.exports = router;
