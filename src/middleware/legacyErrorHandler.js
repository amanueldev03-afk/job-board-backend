const responseUtils = require('../utils/response');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let errorDetails = null;

    logger.error(`${err.message}\nStack: ${err.stack}`);

    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation Error';
        errorDetails = Object.values(err.errors).map(e => ({
            field: e.path,
            message: e.message
        }));
    }

    if (err.code === 11000) {
        statusCode = 400;
        message = 'Duplicate Field Error';
        const field = Object.keys(err.keyPattern)[0];
        errorDetails = [{ field, message: `${field} already exists` }];
    }

    if (err.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid ID Format';
        errorDetails = [{ field: err.path, message: `Invalid ${err.path}` }];
    }

    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid Token';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token Expired - Please login again';
    }

    if (err.code === 'LIMIT_FILE_SIZE') {
        statusCode = 400;
        message = 'File Too Large';
        errorDetails = [{ message: 'File size exceeds limit' }];
    }

    if (err.message === 'Too many requests') {
        statusCode = 429;
        message = 'Too Many Requests';
        errorDetails = [{ message: 'Please try again later' }];
    }

    return responseUtils.sendError(res, message, statusCode, errorDetails);
};

const notFound = (req, res, next) => {
    const error = new Error(`Route ${req.method} ${req.originalUrl} not found`);
    error.statusCode = 404;
    next(error);
};

const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

const rateLimitError = (err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return responseUtils.sendBadRequest(res, 'File too large', err);
    }
    if (err.message === 'Too many requests') {
        return responseUtils.sendError(res, 'Too many requests, please try again later', 429);
    }
    next(err);
};

const validationErrorHandler = (req, res, next) => {
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map(err => ({
            field: err.param,
            message: err.msg,
            value: err.value
        }));
        
        return responseUtils.sendBadRequest(res, 'Validation failed', formattedErrors);
    }
    
    next();
};

module.exports = {
    errorHandler,
    notFound,
    asyncHandler,
    rateLimitError,
    validationErrorHandler
};