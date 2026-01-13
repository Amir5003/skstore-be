const express = require('express');
const { uploadImage, uploadImages, deleteImage } = require('../controllers/upload.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const upload = require('../utils/upload.util');

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// Upload routes
router.post('/image', upload.single('image'), uploadImage);
router.post('/images', upload.array('images', 10), uploadImages);
router.delete('/image/:publicId', deleteImage);

module.exports = router;
