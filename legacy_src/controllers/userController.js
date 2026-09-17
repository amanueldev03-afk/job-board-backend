const User = require('../models/User');
const Company = require('../models/Company');
const Job = require('../models/Job');
const Application = require('../models/Application');
const responseUtils = require('../utils/response');
const logger = require('../utils/logger');
const passwordUtils = require('../utils/passwordUtils');
const crypto = require('crypto');
const emailService = require('../services/emailService');
const tokenService = require('../services/tokenService');

const getAllUsers = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const query = {};
        
        if (req.query.role) {
            query.role = req.query.role;
        }
        
        if (req.query.isActive !== undefined) {
            query.isActive = req.query.isActive === 'true';
        }

        const users = await User.find(query)
            .select('-password')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await User.countDocuments(query);

        responseUtils.sendSuccess(res, {
            users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        }, 'Users retrieved successfully');

    } catch (error) {
        next(error);
    }
};

const getUserById = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password')
            .populate('companyProfile');

        if (!user) {
            return responseUtils.sendNotFound(res, 'User not found');
        }

        let companyProfile = null;
        if (user.role === 'company') {
            companyProfile = await Company.findOne({ user: user._id });
        }

        responseUtils.sendSuccess(res, { user, companyProfile }, 'User retrieved successfully');

    } catch (error) {
        next(error);
    }
};

const getCurrentUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select('-password');

        let companyProfile = null;
        if (user.role === 'company') {
            companyProfile = await Company.findOne({ user: user._id });
        }

        const stats = {
            totalJobs: 0,
            totalApplications: 0,
            pendingApplications: 0
        };

        if (user.role === 'company' && companyProfile) {
            stats.totalJobs = await Job.countDocuments({ company: companyProfile._id });
        }

        if (user.role === 'candidate') {
            stats.totalApplications = await Application.countDocuments({ candidate: user._id });
            stats.pendingApplications = await Application.countDocuments({ 
                candidate: user._id, 
                status: 'pending' 
            });
        }

        responseUtils.sendSuccess(res, { user, companyProfile, stats }, 'Current user retrieved');

    } catch (error) {
        next(error);
    }
};

const updateCurrentUser = async (req, res, next) => {
    try {
        const { name, avatar, profile } = req.body;

        const updateData = {};
        if (name) updateData.name = name;
        if (avatar) updateData.avatar = avatar;
        
        if (profile) {
            updateData.profile = {};
            if (profile.phone) updateData.profile.phone = profile.phone;
            if (profile.bio) updateData.profile.bio = profile.bio;
            if (profile.skills) updateData.profile.skills = profile.skills;
            if (profile.location) updateData.profile.location = profile.location;
            if (profile.resume) updateData.profile.resume = profile.resume;
            if (profile.linkedin) updateData.profile.linkedin = profile.linkedin;
            if (profile.github) updateData.profile.github = profile.github;
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        logger.info(`User profile updated: ${user.email}`);

        responseUtils.sendSuccess(res, { user }, 'Profile updated successfully');

    } catch (error) {
        next(error);
    }
};

const deleteCurrentUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        if (user.role === 'company') {
            const company = await Company.findOne({ user: user._id });
            if (company) {
                await Job.deleteMany({ company: company._id });
                await company.deleteOne();
            }
        }

        if (user.role === 'candidate') {
            await Application.deleteMany({ candidate: user._id });
        }

        await user.deleteOne();

        res.clearCookie('token');

        logger.info(`User account deleted: ${user.email}`);

        responseUtils.sendSuccess(res, null, 'Account deleted successfully');

    } catch (error) {
        next(error);
    }
};

const updateUserRole = async (req, res, next) => {
    try {
        const { role } = req.body;

        if (!['candidate', 'company', 'admin'].includes(role)) {
            return responseUtils.sendBadRequest(res, 'Invalid role');
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return responseUtils.sendNotFound(res, 'User not found');
        }

        logger.info(`User role updated: ${user.email} -> ${role}`);

        responseUtils.sendSuccess(res, { user }, 'User role updated successfully');

    } catch (error) {
        next(error);
    }
};

const toggleUserStatus = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return responseUtils.sendNotFound(res, 'User not found');
        }

        user.isActive = !user.isActive;
        await user.save();

        logger.info(`User status toggled: ${user.email} -> ${user.isActive ? 'Active' : 'Inactive'}`);

        responseUtils.sendSuccess(res, { 
            isActive: user.isActive 
        }, `User ${user.isActive ? 'activated' : 'deactivated'} successfully`);

    } catch (error) {
        next(error);
    }
};

const getUserStats = async (req, res, next) => {
    try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });
        const candidateCount = await User.countDocuments({ role: 'candidate' });
        const companyCount = await User.countDocuments({ role: 'company' });
        const adminCount = await User.countDocuments({ role: 'admin' });

        const recentUsers = await User.find()
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(5);

        responseUtils.sendSuccess(res, {
            total: totalUsers,
            active: activeUsers,
            inactive: totalUsers - activeUsers,
            byRole: {
                candidate: candidateCount,
                company: companyCount,
                admin: adminCount
            },
            recent: recentUsers
        }, 'User statistics retrieved');

    } catch (error) {
        next(error);
    }
};

// Request account deletion
const requestAccountDeletion = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        if (user.deletionRequested) {
            return responseUtils.sendBadRequest(res, 'Deletion already requested. Check your email for confirmation link.');
        }

        const deletionToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(deletionToken).digest('hex');

        user.deletionRequested = true;
        user.deletionToken = hashedToken;
        user.deletionExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
        user.scheduledDeletionDate = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days grace period
        await user.save();

        // Send deletion confirmation email
        const deletionUrl = `${env.CLIENT_URL}/confirm-deletion/${deletionToken}`;
        
        await emailService.sendAccountDeletionConfirmation(user.email, user.name, deletionUrl, 7);

        logger.info(`Account deletion requested for: ${user.email}`);

        responseUtils.sendSuccess(res, {
            message: `Deletion requested. A confirmation link has been sent to ${user.email}. You have 24 hours to confirm. After confirmation, your account will be permanently deleted after 7 days.`,
            scheduledDeletionDate: user.scheduledDeletionDate
        }, 'Deletion request submitted');

    } catch (error) {
        next(error);
    }
};

// Confirm account deletion
const confirmAccountDeletion = async (req, res, next) => {
    try {
        const { token } = req.params;
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            deletionToken: hashedToken,
            deletionExpires: { $gt: Date.now() },
            deletionRequested: true
        });

        if (!user) {
            return responseUtils.sendBadRequest(res, 'Invalid or expired deletion confirmation link');
        }

        // Don't delete immediately - just mark for scheduled deletion
        // Actual deletion happens via cron job or after grace period

        responseUtils.sendSuccess(res, {
            message: `Account deletion confirmed. Your account will be permanently deleted on ${new Date(user.scheduledDeletionDate).toLocaleDateString()}. You can cancel this request by logging in before that date.`,
            scheduledDeletionDate: user.scheduledDeletionDate
        }, 'Deletion confirmed');

    } catch (error) {
        next(error);
    }
};

// Cancel account deletion request
const cancelDeletionRequest = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user.deletionRequested) {
            return responseUtils.sendBadRequest(res, 'No active deletion request found');
        }

        user.deletionRequested = false;
        user.deletionToken = null;
        user.deletionExpires = null;
        user.scheduledDeletionDate = null;
        await user.save();

        logger.info(`Deletion request cancelled for: ${user.email}`);

        responseUtils.sendSuccess(res, null, 'Account deletion request cancelled. Your account is safe.');

    } catch (error) {
        next(error);
    }
};

// Get deletion status
const getDeletionStatus = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        responseUtils.sendSuccess(res, {
            deletionRequested: user.deletionRequested,
            scheduledDeletionDate: user.scheduledDeletionDate,
            deletionExpires: user.deletionExpires
        }, 'Deletion status retrieved');

    } catch (error) {
        next(error);
    }
};
module.exports = {
    getAllUsers,
    getUserById,
    getCurrentUser,
    updateCurrentUser,
    deleteCurrentUser,
    updateUserRole,
    toggleUserStatus,
    getUserStats,
    requestAccountDeletion,
    confirmAccountDeletion,
    cancelDeletionRequest,
    getDeletionStatus
};