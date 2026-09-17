import { body } from 'express-validator';

export const registerCandidateValidator = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('A valid email address is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
  body('headline')
    .optional()
    .trim()
    .isLength({ max: 150 })
    .withMessage('Headline cannot exceed 150 characters'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location cannot exceed 100 characters'),
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array of strings'),
];

export const registerEmployerValidator = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('A valid email address is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Contact representative name is required')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
  body('companyName')
    .trim()
    .notEmpty()
    .withMessage('Company name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters'),
  body('companyDescription')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Company description cannot exceed 2000 characters'),
  body('companyWebsite')
    .optional()
    .trim()
    .isURL()
    .withMessage('Company website must be a valid URL'),
  body('industry')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Industry cannot exceed 100 characters'),
  body('companySize')
    .optional()
    .trim(),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location cannot exceed 100 characters'),
];

export const loginValidator = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('A valid email address is required')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];
