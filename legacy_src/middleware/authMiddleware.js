const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwtConfig');
const User = require('../models/User');
const responseUtils = require('../utils/response');
const logger = require('../utils/logger');
const tokenService = require('../services/tokenService');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        logger.warn(`No token provided for ${req.method} ${req.path}`);
        return responseUtils.sendUnauthorized(res, 'Not authorized - No token provided');
    }

    try {
        const decoded = tokenService.verifyAccessToken(token);
        
        if (!decoded) {
            return responseUtils.sendUnauthorized(res, 'Invalid or expired token');
        }

        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            logger.warn(`User not found for token: ${decoded.id}`);
            return responseUtils.sendUnauthorized(res, 'User no longer exists');
        }

        if (!user.isActive) {
            logger.warn(`Inactive user attempted access: ${user.email}`);
            return responseUtils.sendUnauthorized(res, 'Account deactivated');
        }

        req.user = user;
        next();
        
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            logger.warn(`Expired token used for ${req.method} ${req.path}`);
            return responseUtils.sendUnauthorized(res, 'Token expired - Please refresh token');
        }
        
        if (error.name === 'JsonWebTokenError') {
            logger.warn(`Invalid token used for ${req.method} ${req.path}`);
            return responseUtils.sendUnauthorized(res, 'Invalid token');
        }

        logger.error(`Auth error: ${error.message}`);
        return responseUtils.sendUnauthorized(res, 'Authentication failed');
    }
};

const optionalAuth = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
        try {
            const decoded = tokenService.verifyAccessToken(token);
            if (decoded) {
                const user = await User.findById(decoded.id).select('-password');
                if (user && user.isActive) {
                    req.user = user;
                }
            }
        } catch (error) {
            // Optional auth - don't fail if token is invalid
        }
    }
    
    next();
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return responseUtils.sendUnauthorized(res, 'Not authenticated');
        }

        if (!roles.includes(req.user.role)) {
            logger.warn(`User ${req.user.email} with role ${req.user.role} attempted to access ${req.method} ${req.path}`);
            return responseUtils.sendForbidden(res, `Role ${req.user.role} not authorized for this resource`);
        }

        next();
    };
};

const checkOwnership = (Model, paramName = 'id') => {
    return async (req, res, next) => {
        try {
            const resource = await Model.findById(req.params[paramName]);
            
            if (!resource) {
                return responseUtils.sendNotFound(res, 'Resource not found');
            }

            if (resource.user && resource.user.toString() !== req.user._id.toString()) {
                logger.warn(`User ${req.user.email} attempted to access resource not owned`);
                return responseUtils.sendForbidden(res, 'Not authorized to modify this resource');
            }

            if (resource.candidate && resource.candidate.toString() !== req.user._id.toString()) {
                logger.warn(`User ${req.user.email} attempted to access application not owned`);
                return responseUtils.sendForbidden(res, 'Not authorized to access this application');
            }

            req.resource = resource;
            next();
        } catch (error) {
            logger.error(`Ownership check failed: ${error.message}`);
            return responseUtils.sendError(res, 'Error checking resource ownership', 500);
        }
    };
};

const checkCompanyOwnership = (JobModel) => {
    return async (req, res, next) => {
        try {
            const job = await JobModel.findById(req.params.id).populate('company');
            
            if (!job) {
                return responseUtils.sendNotFound(res, 'Job not found');
            }

            if (job.company.user.toString() !== req.user._id.toString()) {
                logger.warn(`User ${req.user.email} attempted to modify job not owned`);
                return responseUtils.sendForbidden(res, 'Not authorized - This job belongs to another company');
            }

            req.job = job;
            next();
        } catch (error) {
            logger.error(`Company ownership check failed: ${error.message}`);
            return responseUtils.sendError(res, 'Error checking job ownership', 500);
        }
    };
};

const requireCompanyProfile = async (req, res, next) => {
    try {
        const Company = require('../models/Company');
        const company = await Company.findOne({ user: req.user._id });
        
        if (!company) {
            return responseUtils.sendBadRequest(res, 'Company profile required. Please complete your company profile first.');
        }
        
        req.company = company;
        next();
    } catch (error) {
        logger.error(`Company profile check failed: ${error.message}`);
        return responseUtils.sendError(res, 'Error verifying company profile', 500);
    }
};

module.exports = {
    protect,
    optionalAuth,
    authorize,
    checkOwnership,
    checkCompanyOwnership,
    requireCompanyProfile
};