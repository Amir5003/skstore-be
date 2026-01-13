const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { uploadToCloudinary, deleteFromCloudinary } = require('../services/cloudinary.service');

/**
 * @desc    Upload single image to Cloudinary
 * @route   POST /api/upload/image
 * @access  Private/Admin
 */
const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('Please upload an image', 400);
  }

  const result = await uploadToCloudinary(req.file.buffer, 'products');

  res.status(200).json({
    success: true,
    data: {
      url: result.secure_url,
      publicId: result.public_id
    }
  });
});

/**
 * @desc    Upload multiple images to Cloudinary
 * @route   POST /api/upload/images
 * @access  Private/Admin
 */
const uploadImages = asyncHandler(async (req, res) => {
  console.log('\n=== UPLOAD REQUEST START ===');
  console.log('req.files exists:', !!req.files);
  console.log('req.files type:', typeof req.files);
  console.log('req.files length:', req.files?.length);
  
  if (!req.files || req.files.length === 0) {
    console.log('❌ No files in request');
    throw new AppError('Please upload at least one image', 400);
  }

  console.log('Files received:', req.files.length);
  console.log('File details:', req.files.map(f => ({ 
    originalname: f.originalname,
    size: f.size, 
    mimetype: f.mimetype,
    bufferLength: f.buffer?.length 
  })));

  const results = [];
  
  for (let i = 0; i < req.files.length; i++) {
    const file = req.files[i];
    console.log(`\nUploading file ${i + 1}/${req.files.length}: ${file.originalname}`);
    
    try {
      const result = await uploadToCloudinary(file.buffer, 'products');
      console.log(`✅ Upload ${i + 1} successful:`, result.url);
      results.push(result);
    } catch (error) {
      console.error(`❌ Upload ${i + 1} failed:`, error.message);
      console.error('Full error:', error);
      throw new AppError(`Failed to upload ${file.originalname}: ${error.message}`, 500);
    }
  }

  console.log('\n✅ All uploads successful');
  console.log('=== UPLOAD REQUEST END ===\n');

  res.status(200).json({
    success: true,
    data: { 
      images: results 
    }
  });
});

/**
 * @desc    Delete image from Cloudinary
 * @route   DELETE /api/upload/image/:publicId
 * @access  Private/Admin
 */
const deleteImage = asyncHandler(async (req, res) => {
  const { publicId } = req.params;

  if (!publicId) {
    throw new AppError('Public ID is required', 400);
  }

  await deleteFromCloudinary(publicId);

  res.status(200).json({
    success: true,
    message: 'Image deleted successfully'
  });
});

module.exports = {
  uploadImage,
  uploadImages,
  deleteImage
};
