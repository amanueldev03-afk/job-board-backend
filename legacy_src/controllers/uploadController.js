const User = require('../models/User');
const Company = require('../models/Company');
const responseUtils = require('../utils/response');
const logger = require('../utils/logger');

const uploadAvatar = async (req, res, next) => {
    try {
        if (!req.file) {
            return responseUtils.sendBadRequest(res, 'No file uploaded. Please select an image file.');
        }

        const avatarUrl = `/uploads/avatars/${req.file.filename}`;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { avatar: avatarUrl },
            { new: true }
        ).select('-password');

        logger.info(`Avatar uploaded for user: ${user.email}`);

        responseUtils.sendSuccess(res, { avatar: avatarUrl }, 'Avatar uploaded successfully');

    } catch (error) {
        next(error);
    }
};

const uploadLogo = async (req, res, next) => {
    try {
        if (!req.file) {
            return responseUtils.sendBadRequest(res, 'No file uploaded. Please select an image file.');
        }

        const logoUrl = `/uploads/logos/${req.file.filename}`;

        const company = await Company.findOneAndUpdate(
            { user: req.user._id },
            { logo: logoUrl },
            { new: true }
        );

        if (!company) {
            return responseUtils.sendNotFound(res, 'Company profile not found');
        }

        logger.info(`Logo uploaded for company: ${company.companyName}`);

        responseUtils.sendSuccess(res, { logo: logoUrl }, 'Company logo uploaded successfully');

    } catch (error) {
        next(error);
    }
};

const uploadResume = async (req, res, next) => {
    try {
        if (!req.file) {
            return responseUtils.sendBadRequest(res, 'No file uploaded. Please select a PDF or DOC file.');
        }

        const resumeUrl = `/uploads/resumes/${req.file.filename}`;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { 'profile.resume': resumeUrl },
            { new: true }
        ).select('-password');

        logger.info(`Resume uploaded for user: ${user.email}`);

        responseUtils.sendSuccess(res, { resume: resumeUrl }, 'Resume uploaded successfully');

    } catch (error) {
        next(error);
    }
};

const deleteAvatar = async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { avatar: 'default-avatar.png' },
            { new: true }
        ).select('-password');

        responseUtils.sendSuccess(res, null, 'Avatar deleted successfully');

    } catch (error) {
        next(error);
    }
};

module.exports = {
    uploadAvatar,
    uploadLogo,
    uploadResume,
    deleteAvatar
};