const express = require('express');
const { uploadImage, uploadImages, deleteImage } = require('../controllers/upload.controller');
const { protect } = require('../middlewares/auth.middleware');
const { tenantIsolation } = require('../middlewares/tenantIsolation.middleware');
const { requirePermission, PERMISSIONS } = require('../middlewares/roleAuth.middleware');
const upload = require('../utils/upload.util');

const router = express.Router();

// All routes require authentication and tenant isolation
router.use(protect);
router.use(tenantIsolation);

// Upload routes - require product management permission
router.post('/image', requirePermission(PERMISSIONS.MANAGE_PRODUCTS), upload.single('image'), uploadImage);
router.post('/images', requirePermission(PERMISSIONS.MANAGE_PRODUCTS), upload.array('images', 10), uploadImages);
router.delete('/image/:publicId', requirePermission(PERMISSIONS.MANAGE_PRODUCTS), deleteImage);

module.exports = router;
