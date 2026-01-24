const express = require('express');
const { body } = require('express-validator');
const {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerOrders
} = require('../controllers/customer.controller');
const { protect } = require('../middlewares/auth.middleware');
const { tenantIsolation } = require('../middlewares/tenantIsolation.middleware');
const { requirePermission, PERMISSIONS } = require('../middlewares/roleAuth.middleware');
const validate = require('../middlewares/validate.middleware');

const router = express.Router();

// All customer routes require authentication, tenant isolation, and MANAGE_CUSTOMERS permission
router.use(protect, tenantIsolation, requirePermission(PERMISSIONS.MANAGE_CUSTOMERS));

// Validation rules
const customerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Customer name is required'),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email address')
];

// Routes
router.get('/', getCustomers);
router.get('/:id', getCustomer);
router.post('/', customerValidation, validate, createCustomer);
router.put('/:id', customerValidation, validate, updateCustomer);
router.delete('/:id', deleteCustomer);
router.get('/:id/orders', getCustomerOrders);

module.exports = router;
