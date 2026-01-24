const express = require('express');
const { body } = require('express-validator');
const {
  registerOwner,
  login,
  logout,
  refresh,
  getMe,
  updatePassword,
  inviteStaff,
  registerCustomer
} = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');
const { tenantIsolation } = require('../middlewares/tenantIsolation.middleware');
const { requireOwner } = require('../middlewares/roleAuth.middleware');
const validate = require('../middlewares/validate.middleware');

const router = express.Router();

// Validation rules
const registerOwnerValidation = [
  body('shopName')
    .trim()
    .notEmpty().withMessage('Shop name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Shop name must be between 2 and 100 characters'),
  body('shopSlug')
    .optional()
    .trim()
    .matches(/^[a-z0-9-]+$/).withMessage('Shop URL can only contain lowercase letters, numbers, and hyphens'),
  body('ownerName')
    .trim()
    .notEmpty().withMessage('Owner name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('ownerEmail')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),
  body('ownerPhone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[0-9]{10}$/).withMessage('Please provide a valid 10-digit phone number'),
  body('ownerPassword')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('agreedToTerms')
    .equals('true').withMessage('You must agree to Terms & Conditions'),
  body('agreedToSellerAgreement')
    .equals('true').withMessage('You must agree to Seller Agreement'),
  body('agreedToProhibitedItems')
    .equals('true').withMessage('You must agree to Prohibited Items Policy')
];

const loginValidation = [
  body('shopSlug')
    .trim()
    .notEmpty().withMessage('Shop URL is required'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),
  body('password')
    .notEmpty().withMessage('Password is required')
];

const inviteStaffValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[0-9]{10}$/).withMessage('Please provide a valid 10-digit phone number'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const updatePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

const registerCustomerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[0-9]{10}$/).withMessage('Please provide a valid 10-digit phone number'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('shopSlug')
    .trim()
    .notEmpty().withMessage('Shop slug is required')
];

// Routes
// Public routes
router.post('/register-owner', registerOwnerValidation, validate, registerOwner);
router.post('/register-customer', registerCustomerValidation, validate, registerCustomer);
router.post('/login', loginValidation, validate, login);
router.post('/refresh', refresh);

// Protected routes (require authentication)
router.post('/logout', protect, logout);
router.get('/me', protect, tenantIsolation, getMe);
router.put('/password', protect, updatePasswordValidation, validate, updatePassword);

// Owner-only routes (require OWNER role)
router.post('/invite-staff', protect, tenantIsolation, requireOwner(), inviteStaffValidation, validate, inviteStaff);

module.exports = router;
