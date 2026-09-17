const { body, param, query, validationResult } = require('express-validator');
const responseUtils = require('../utils/response');

const validate = (req, res, next) => {
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

const validateRegister = [
    body('email')
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail()
        .notEmpty().withMessage('Email is required'),
    
    body('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])/).withMessage('Password must contain letter, number, and special character'),
    
    body('name')
        .trim()
        .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
        .notEmpty().withMessage('Name is required'),
    
    body('role')
        .optional()
        .isIn(['candidate', 'company']).withMessage('Role must be candidate or company'),
    
    validate
];

const validateLogin = [
    body('email')
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail()
        .notEmpty().withMessage('Email is required'),
    
    body('password')
        .notEmpty().withMessage('Password is required'),
    
    validate
];

const validateJob = [
    body('title')
        .trim()
        .isLength({ min: 5, max: 100 }).withMessage('Job title must be between 5 and 100 characters')
        .notEmpty().withMessage('Job title is required'),
    
    body('description')
        .trim()
        .isLength({ min: 50 }).withMessage('Job description must be at least 50 characters')
        .notEmpty().withMessage('Job description is required'),
    
    body('requirements')
        .isArray({ min: 1 }).withMessage('At least one requirement is required'),
    
    body('location')
        .trim()
        .notEmpty().withMessage('Location is required'),
    
    body('compensation.salaryMin')
        .isInt({ min: 0 }).withMessage('Minimum salary must be a positive number'),
    
    body('compensation.salaryMax')
        .isInt({ min: 0 }).withMessage('Maximum salary must be a positive number')
        .custom((value, { req }) => {
            if (value < req.body.compensation?.salaryMin) {
                throw new Error('Maximum salary must be greater than or equal to minimum salary');
            }
            return true;
        }),
    
    body('employmentType')
        .isIn(['full-time', 'part-time', 'contract', 'internship', 'freelance', 'remote'])
        .withMessage('Invalid employment type'),
    
    body('experienceLevel')
        .isIn(['entry', 'junior', 'mid', 'senior', 'lead', 'executive'])
        .withMessage('Invalid experience level'),
    
    body('skills')
        .isArray({ min: 1 }).withMessage('At least one skill is required'),
    
    body('deadline')
        .isISO8601().withMessage('Please provide a valid date')
        .custom((value) => {
            if (new Date(value) <= new Date()) {
                throw new Error('Deadline must be a future date');
            }
            return true;
        }),
    
    validate
];

const validateCompany = [
    body('companyName')
        .trim()
        .isLength({ min: 2, max: 100 }).withMessage('Company name must be between 2 and 100 characters')
        .notEmpty().withMessage('Company name is required'),
    
    body('description')
        .trim()
        .isLength({ min: 50, max: 2000 }).withMessage('Description must be between 50 and 2000 characters')
        .notEmpty().withMessage('Description is required'),
    
    body('location.address')
        .notEmpty().withMessage('Address is required'),
    
    body('location.city')
        .notEmpty().withMessage('City is required'),
    
    body('location.country')
        .notEmpty().withMessage('Country is required'),
    
    body('website')
        .optional()
        .isURL().withMessage('Please provide a valid URL'),
    
    body('industry')
        .isIn(['Technology', 'Healthcare', 'Finance', 'Education', 'Retail', 'Manufacturing', 'Construction', 'Hospitality', 'Other'])
        .withMessage('Invalid industry'),
    
    body('companySize')
        .optional()
        .isIn(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'])
        .withMessage('Invalid company size'),
    
    validate
];

const validateApplication = [
    body('documents.resume')
        .notEmpty().withMessage('Resume is required')
        .isURL().withMessage('Please provide a valid URL for resume'),
    
    body('documents.coverLetter')
        .optional()
        .isLength({ max: 2000 }).withMessage('Cover letter cannot exceed 2000 characters'),
    
    body('documents.portfolio')
        .optional()
        .isURL().withMessage('Please provide a valid URL for portfolio'),
    
    validate
];

const validateIdParam = [
    param('id')
        .isMongoId().withMessage('Invalid ID format'),
    
    validate
];

const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer')
        .toInt(),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
        .toInt(),
    
    validate
];

const validateJobFilters = [
    query('employmentType')
        .optional()
        .isIn(['full-time', 'part-time', 'contract', 'internship', 'freelance', 'remote']),
    
    query('experienceLevel')
        .optional()
        .isIn(['entry', 'junior', 'mid', 'senior', 'lead', 'executive']),
    
    query('minSalary')
        .optional()
        .isInt({ min: 0 }).toInt(),
    
    query('location')
        .optional()
        .trim(),
    
    query('search')
        .optional()
        .trim(),
    
    validate
];

const validateStatusUpdate = [
    body('status')
        .isIn(['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'])
        .withMessage('Invalid status value'),
    
    body('note')
        .optional()
        .isLength({ max: 500 }).withMessage('Note cannot exceed 500 characters'),
    
    validate
];

const validateProfileUpdate = [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    
    body('profile.phone')
        .optional()
        .isMobilePhone().withMessage('Please provide a valid phone number'),
    
    body('profile.bio')
        .optional()
        .isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters'),
    
    body('profile.skills')
        .optional()
        .isArray().withMessage('Skills must be an array'),
    
    body('profile.linkedin')
        .optional()
        .isURL().withMessage('Please provide a valid LinkedIn URL'),
    
    body('profile.github')
        .optional()
        .isURL().withMessage('Please provide a valid GitHub URL'),
    
    validate
];

module.exports = {
    validate,
    validateRegister,
    validateLogin,
    validateJob,
    validateCompany,
    validateApplication,
    validateIdParam,
    validatePagination,
    validateJobFilters,
    validateStatusUpdate,
    validateProfileUpdate
};