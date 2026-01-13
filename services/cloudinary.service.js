const cloudinary = require('cloudinary').v2;

// Ensure configuration is loaded
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload image to Cloudinary
 */
const uploadToCloudinary = async (fileBuffer, folder = 'products') => {
  console.log('Starting Cloudinary upload, buffer size:', fileBuffer.length);
  console.log('Cloudinary config check:', {
    cloud_name: cloudinary.config().cloud_name,
    api_key: cloudinary.config().api_key,
    has_secret: !!cloudinary.config().api_secret
  });
  
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `skstore/${folder}`,
        resource_type: 'image'
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary API error:', JSON.stringify(error, null, 2));
          reject(new Error(`Cloudinary upload failed: ${error.message || JSON.stringify(error)}`));
        } else {
          console.log('Cloudinary upload success:', result.secure_url);
          resolve({
            url: result.secure_url,
            publicId: result.public_id
          });
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
};

/**
 * Delete image from Cloudinary
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

/**
 * Upload multiple images to Cloudinary
 */
const uploadMultipleToCloudinary = async (files, folder = 'products') => {
  const uploadPromises = files.map(file => uploadToCloudinary(file.buffer, folder));
  return Promise.all(uploadPromises);
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  uploadMultipleToCloudinary
};
