const express = require('express');
const { body } = require('express-validator');
const {
  getProfile,
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  getOrderHistory
} = require('../controllers/user.controller');
const { protect } = require('../middlewares/auth.middleware');
const { tenantIsolation } = require('../middlewares/tenantIsolation.middleware');
const validate = require('../middlewares/validate.middleware');

const router = express.Router();

// All user routes require authentication and tenant isolation
router.use(protect, tenantIsolation);

// Profile
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Addresses
const addressValidation = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('addressLine1').trim().notEmpty().withMessage('Address is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('pincode').trim().notEmpty().withMessage('Pincode is required'),
  body('country').trim().notEmpty().withMessage('Country is required')
];

router.post('/addresses', addressValidation, validate, addAddress);
router.put('/addresses/:addressId', updateAddress);
router.delete('/addresses/:addressId', deleteAddress);
router.get('/orders', getOrderHistory);

module.exports = router;
