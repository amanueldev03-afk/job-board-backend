const cloudinary = require('../config/cloudinary');
const logger = require('../utils/logger');

const uploadToCloudinary = async (fileBuffer, options = {}) => {
    try {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: options.folder || 'general',
                    resource_type: options.resource_type || 'auto',
                    transformation: options.transformation || []
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(fileBuffer);
        });
    } catch (error) {
        logger.error(`Cloudinary upload failed: ${error.message}`);
        throw error;
    }
};

const uploadAvatar = async (fileBuffer, userId) => {
    return await uploadToCloudinary(fileBuffer, {
        folder: `users/${userId}/avatar`,
        transformation: [{ width: 200, height: 200, crop: 'fill' }]
    });
};

const uploadCompanyLogo = async (fileBuffer, companyId) => {
    return await uploadToCloudinary(fileBuffer, {
        folder: `companies/${companyId}/logo`,
        transformation: [{ width: 300, height: 300, crop: 'fill' }]
    });
};

const uploadResume = async (fileBuffer, userId, jobId) => {
    return await uploadToCloudinary(fileBuffer, {
        folder: `users/${userId}/resumes`,
        resource_type: 'raw',
        public_id: `resume_${jobId}`
    });
};

const deleteFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        logger.error(`Cloudinary delete failed: ${error.message}`);
        throw error;
    }
};

module.exports = {
    uploadToCloudinary,
    uploadAvatar,
    uploadCompanyLogo,
    uploadResume,
    deleteFromCloudinary
};