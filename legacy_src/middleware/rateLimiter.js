const rateLimit = require('express-rate-limit');

const createLimiter = (windowMs, max, message) => {
    return rateLimit({
        windowMs: windowMs,
        max: max,
        message: {
            success: false,
            message: message || `Too many requests, please try again later.`
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: false
    });
};

// Login limiter: 5 attempts per 15 minutes
const loginLimiter = createLimiter(
    15 * 60 * 1000,
    5,
    'Too many login attempts. Please try again after 15 minutes.'
);

// Register limiter: 3 attempts per hour
const registerLimiter = createLimiter(
    60 * 60 * 1000,
    3,
    'Too many registration attempts. Please try again after 1 hour.'
);

// Forgot password limiter: 3 attempts per hour
const forgotPasswordLimiter = createLimiter(
    60 * 60 * 1000,
    3,
    'Too many password reset attempts. Please try again after 1 hour.'
);

// Job posting limiter: 10 jobs per hour
const jobPostLimiter = createLimiter(
    60 * 60 * 1000,
    10,
    'Too many job postings. Please wait before posting more jobs.'
);

// Application limiter: 20 applications per day
const applicationLimiter = createLimiter(
    24 * 60 * 60 * 1000,
    20,
    'Too many applications. Please try again tomorrow.'
);

// General API limiter: 100 requests per minute
const generalLimiter = createLimiter(
    60 * 1000,
    100,
    'Too many requests. Please slow down.'
);

// Resend verification limiter: 3 attempts per hour
const resendVerificationLimiter = createLimiter(
    60 * 60 * 1000,
    3,
    'Too many resend attempts. Please try again after 1 hour.'
);

module.exports = {
    loginLimiter,
    registerLimiter,
    forgotPasswordLimiter,
    jobPostLimiter,
    applicationLimiter,
    generalLimiter,
    resendVerificationLimiter
};