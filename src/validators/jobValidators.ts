import { body, param, ValidationChain } from 'express-validator';

const VALID_JOB_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE'];
const VALID_EXPERIENCE_LEVELS = ['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE'];
const VALID_JOB_STATUSES = ['DRAFT', 'OPEN', 'CLOSED', 'EXPIRED'];

export const validateCreateJob: ValidationChain[] = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Job title is required')
    .isLength({ min: 3, max: 150 })
    .withMessage('Job title must be between 3 and 150 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Job description is required')
    .isLength({ min: 10 })
    .withMessage('Job description must be at least 10 characters long'),

  body('location')
    .trim()
    .notEmpty()
    .withMessage('Job location is required')
    .isLength({ max: 100 })
    .withMessage('Job location cannot exceed 100 characters'),

  body('requirements')
    .optional()
    .isArray()
    .withMessage('Requirements must be an array of strings'),

  body('responsibilities')
    .optional()
    .isArray()
    .withMessage('Responsibilities must be an array of strings'),

  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array of strings'),

  body('isRemote')
    .optional()
    .isBoolean()
    .withMessage('isRemote must be a boolean value'),

  body('jobType')
    .optional()
    .isIn(VALID_JOB_TYPES)
    .withMessage(`Job type must be one of: ${VALID_JOB_TYPES.join(', ')}`),

  body('experienceLevel')
    .optional()
    .isIn(VALID_EXPERIENCE_LEVELS)
    .withMessage(`Experience level must be one of: ${VALID_EXPERIENCE_LEVELS.join(', ')}`),

  body('salaryMin')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Minimum salary must be a positive number'),

  body('salaryMax')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Maximum salary must be a positive number'),

  body('currency')
    .optional()
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter currency code (e.g. USD)'),

  body('status')
    .optional()
    .isIn(VALID_JOB_STATUSES)
    .withMessage(`Job status must be one of: ${VALID_JOB_STATUSES.join(', ')}`),

  body('deadline')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Deadline must be a valid ISO 8601 date string'),
];

export const validateJobIdParam: ValidationChain[] = [
  param('id')
    .trim()
    .isUUID()
    .withMessage('Job ID must be a valid UUID'),
];

export const validateUpdateJob: ValidationChain[] = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Job title cannot be empty')
    .isLength({ min: 3, max: 150 })
    .withMessage('Job title must be between 3 and 150 characters'),

  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Job description cannot be empty')
    .isLength({ min: 10 })
    .withMessage('Job description must be at least 10 characters long'),

  body('location')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Job location cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Job location cannot exceed 100 characters'),

  body('requirements')
    .optional()
    .isArray()
    .withMessage('Requirements must be an array of strings'),

  body('responsibilities')
    .optional()
    .isArray()
    .withMessage('Responsibilities must be an array of strings'),

  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array of strings'),

  body('isRemote')
    .optional()
    .isBoolean()
    .withMessage('isRemote must be a boolean value'),

  body('jobType')
    .optional()
    .isIn(VALID_JOB_TYPES)
    .withMessage(`Job type must be one of: ${VALID_JOB_TYPES.join(', ')}`),

  body('experienceLevel')
    .optional()
    .isIn(VALID_EXPERIENCE_LEVELS)
    .withMessage(`Experience level must be one of: ${VALID_EXPERIENCE_LEVELS.join(', ')}`),

  body('salaryMin')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Minimum salary must be a positive number'),

  body('salaryMax')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Maximum salary must be a positive number'),

  body('currency')
    .optional()
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter currency code (e.g. USD)'),

  body('status')
    .optional()
    .isIn(VALID_JOB_STATUSES)
    .withMessage(`Job status must be one of: ${VALID_JOB_STATUSES.join(', ')}`),

  body('deadline')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Deadline must be a valid ISO 8601 date string'),
];
