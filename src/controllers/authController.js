const User = require('../models/User');
const Company = require('../models/Company');
const crypto = require('crypto');
const responseUtils = require('../utils/response');
const passwordUtils = require('../utils/passwordUtils');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');
const tokenService = require('../services/tokenService');
const RefreshToken = require('../models/RefreshToken');
const emailValidationService = require('../services/emailValidationService');

const register = async (req, res, next) => {
    try {
        const { email, password, name, role } = req.body;

        const emailCheck = await emailValidationService.validateEmail(email);
        
        if (!emailCheck.valid) {
            logger.warn(`Registration failed - Invalid email: ${email} - ${emailCheck.message}`);
            return responseUtils.sendBadRequest(res, emailCheck.message);
        }

        logger.info(`Email validation passed: ${email} (${emailCheck.provider})`);

        if (!passwordUtils.isStrongPassword(password)) {
            return responseUtils.sendBadRequest(res, 
                'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character'
            );
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return responseUtils.sendBadRequest(res, 'Email already registered');
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

        const user = await User.create({
            email,
            password,
            name,
            role: role || 'candidate',
            emailVerificationToken: hashedToken,
            emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000,
            isVerified: false,
            authProvider: 'local'
        });

        try {
            await emailService.sendVerificationEmail(email, name, verificationToken);
            logger.info(`Verification email sent to: ${email}`);
        } catch (emailError) {
            logger.error(`Failed to send verification email to ${email}: ${emailError.message}`);
        }

        responseUtils.sendSuccess(res, {
            message: 'Registration successful! Please check your email to verify your account.',
            userId: user._id,
            emailProvider: emailCheck.provider,
            emailValidated: true
        }, 'Verification email sent', 201);

    } catch (error) {
        next(error);
    }
};

const verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.params;
        
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            emailVerificationToken: hashedToken,
            emailVerificationExpires: { $gt: Date.now() }
        });

        if (!user) {
            return responseUtils.sendBadRequest(res, 'Invalid or expired verification token');
        }

        user.isVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        await emailService.sendWelcomeEmail(user.email, user.name, user.role);

        logger.info(`Email verified: ${user.email}`);

        responseUtils.sendSuccess(res, null, 'Email verified successfully! You can now login.');

    } catch (error) {
        next(error);
    }
};

const resendVerificationEmail = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return responseUtils.sendBadRequest(res, 'Email is required');
        }

        const emailCheck = await emailValidationService.validateEmail(email);
        
        if (!emailCheck.valid) {
            return responseUtils.sendBadRequest(res, emailCheck.message);
        }

        const user = await User.findOne({ email });

        if (!user) {
            return responseUtils.sendSuccess(res, null, 'If your email is registered, a verification link will be sent');
        }

        if (user.isVerified) {
            return responseUtils.sendBadRequest(res, 'Email already verified');
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

        user.emailVerificationToken = hashedToken;
        user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
        await user.save();

        await emailService.sendVerificationEmail(user.email, user.name, verificationToken);

        logger.info(`Verification email resent to: ${user.email}`);

        responseUtils.sendSuccess(res, null, 'Verification email sent. Please check your inbox.');

    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password');
        
        if (!user) {
            logger.warn(`Login failed: User not found - ${email}`);
            return responseUtils.sendUnauthorized(res, 'Invalid email or password');
        }

        if (user.lockUntil && user.lockUntil > Date.now()) {
            const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
            return responseUtils.sendUnauthorized(res, `Account locked. Try again in ${minutesLeft} minutes.`);
        }

        if (!user.isVerified && user.authProvider === 'local') {
            logger.warn(`Login failed: Email not verified - ${email}`);
            return responseUtils.sendUnauthorized(res, 'Please verify your email before logging in');
        }

        const isPasswordValid = await passwordUtils.comparePassword(password, user.password);
        
        if (!isPasswordValid) {
            user.loginAttempts = (user.loginAttempts || 0) + 1;
            
            if (user.loginAttempts >= 5) {
                user.lockUntil = Date.now() + 30 * 60 * 1000;
                await user.save();
                return responseUtils.sendUnauthorized(res, 'Too many failed attempts. Account locked for 30 minutes.');
            }
            
            await user.save();
            logger.warn(`Login failed: Invalid password - ${email} (Attempt ${user.loginAttempts}/5)`);
            return responseUtils.sendUnauthorized(res, 'Invalid email or password');
        }

        user.loginAttempts = 0;
        user.lockUntil = null;
        user.lastLogin = new Date();
        await user.save();

        const accessToken = tokenService.generateAccessToken(user._id);
        const refreshToken = await tokenService.generateRefreshToken(
            user._id,
            req.headers['user-agent'] || 'unknown',
            req.ip || req.socket.remoteAddress
        );

        logger.info(`User logged in: ${email} (${user.role})`);

        let companyProfile = null;
        if (user.role === 'company') {
            companyProfile = await Company.findOne({ user: user._id });
        }

        responseUtils.sendSuccess(res, {
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                avatar: user.avatar,
                isVerified: user.isVerified,
                authProvider: user.authProvider
            },
            accessToken,
            refreshToken,
            companyProfile
        }, 'Login successful');

    } catch (error) {
        next(error);
    }
};

const refreshAccessToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return responseUtils.sendBadRequest(res, 'Refresh token required');
        }
        
        const validRefreshToken = await tokenService.verifyRefreshToken(refreshToken);
        
        if (!validRefreshToken) {
            return responseUtils.sendUnauthorized(res, 'Invalid or expired refresh token');
        }
        
        const newAccessToken = tokenService.generateAccessToken(validRefreshToken.user._id);
        
        responseUtils.sendSuccess(res, {
            accessToken: newAccessToken,
            refreshToken: refreshToken
        }, 'Access token refreshed');
        
    } catch (error) {
        next(error);
    }
};

const logout = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        
        if (refreshToken) {
            await tokenService.revokeRefreshToken(refreshToken);
        }
        
        res.clearCookie('token');

        if (req.user) {
            logger.info(`User logged out: ${req.user.email}`);
        }

        responseUtils.sendSuccess(res, null, 'Logged out successfully');

    } catch (error) {
        next(error);
    }
};

const logoutAllDevices = async (req, res, next) => {
    try {
        await tokenService.revokeAllUserTokens(req.user._id);
        
        res.clearCookie('token');
        
        logger.info(`User logged out from all devices: ${req.user.email}`);
        
        responseUtils.sendSuccess(res, null, 'Logged out from all devices successfully');
        
    } catch (error) {
        next(error);
    }
};

const getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        
        if (!user) {
            return responseUtils.sendNotFound(res, 'User not found');
        }

        let companyProfile = null;
        if (user.role === 'company') {
            companyProfile = await Company.findOne({ user: user._id });
        }

        responseUtils.sendSuccess(res, {
            user,
            companyProfile
        }, 'Profile retrieved');

    } catch (error) {
        next(error);
    }
};

const updateProfile = async (req, res, next) => {
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
            if (profile.linkedin) updateData.profile.linkedin = profile.linkedin;
            if (profile.github) updateData.profile.github = profile.github;
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        logger.info(`Profile updated: ${user.email}`);

        responseUtils.sendSuccess(res, { user }, 'Profile updated successfully');

    } catch (error) {
        next(error);
    }
};

const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user._id).select('+password');

        const isMatch = await passwordUtils.comparePassword(currentPassword, user.password);
        
        if (!isMatch) {
            return responseUtils.sendBadRequest(res, 'Current password is incorrect');
        }

        user.password = newPassword;
        await user.save();

        await tokenService.revokeAllUserTokens(req.user._id);

        logger.info(`Password changed for: ${user.email}`);

        responseUtils.sendSuccess(res, null, 'Password changed successfully. Please login again.');

    } catch (error) {
        next(error);
    }
};

const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        const emailCheck = await emailValidationService.validateEmail(email);
        
        if (!emailCheck.valid) {
            return responseUtils.sendSuccess(res, null, 'If email exists, reset link will be sent');
        }

        const user = await User.findOne({ email });
        
        if (!user) {
            return responseUtils.sendSuccess(res, null, 'If email exists, reset link will be sent');
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        user.passwordResetToken = hashedToken;
        user.passwordResetExpires = Date.now() + 60 * 60 * 1000;
        await user.save();

        await emailService.sendPasswordResetEmail(user.email, user.name, resetToken);

        logger.info(`Password reset requested for: ${email}`);

        responseUtils.sendSuccess(res, null, 'Password reset email sent. Check your inbox.');

    } catch (error) {
        next(error);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return responseUtils.sendBadRequest(res, 'Invalid or expired reset token');
        }

        user.password = newPassword;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        await tokenService.revokeAllUserTokens(user._id);

        logger.info(`Password reset successful for: ${user.email}`);

        responseUtils.sendSuccess(res, null, 'Password reset successful. Please login with your new password.');

    } catch (error) {
        next(error);
    }
};

const testEmailValidation = async (req, res, next) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return responseUtils.sendBadRequest(res, 'Email is required');
        }
        
        const result = await emailValidationService.validateEmail(email);
        
        responseUtils.sendSuccess(res, {
            email: email,
            valid: result.valid,
            message: result.message,
            provider: result.provider,
            code: result.code,
            suggestions: result.suggestions
        }, 'Email validation result');
        
    } catch (error) {
        next(error);
    }
};

const googleLoginSuccess = async (req, res, next) => {
    try {
        if (!req.user) {
            return responseUtils.sendUnauthorized(res, 'Google authentication failed');
        }

        const accessToken = tokenService.generateAccessToken(req.user._id);
        const refreshToken = await tokenService.generateRefreshToken(
            req.user._id,
            req.headers['user-agent'] || 'unknown',
            req.ip || req.socket.remoteAddress
        );

        logger.info(`Google login successful: ${req.user.email}`);

        responseUtils.sendSuccess(res, {
            user: {
                id: req.user._id,
                email: req.user.email,
                name: req.user.name,
                role: req.user.role,
                avatar: req.user.avatar,
                isVerified: req.user.isVerified,
                authProvider: req.user.authProvider
            },
            accessToken,
            refreshToken
        }, 'Google login successful');

    } catch (error) {
        next(error);
    }
};

const googleLoginFailed = async (req, res, next) => {
    responseUtils.sendUnauthorized(res, 'Google authentication failed. Please try again.');
};

module.exports = {
    register,
    verifyEmail,
    resendVerificationEmail,
    login,
    refreshAccessToken,
    logout,
    logoutAllDevices,
    getMe,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    testEmailValidation,
    googleLoginSuccess,
    googleLoginFailed
};
