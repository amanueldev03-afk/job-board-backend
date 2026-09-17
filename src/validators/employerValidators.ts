import { body, param, ValidationChain } from 'express-validator';

export const validateUpdateEmployerProfile: ValidationChain[] = [
  body('companyName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters long'),

  body('companyDescription')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Company description cannot exceed 2000 characters'),

  body('companyWebsite')
    .optional({ checkFalsy: true })
    .trim()
    .isURL({ require_protocol: true })
    .withMessage('Company website must be a valid URL including protocol (e.g., https://example.com)'),

  body('industry')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Industry name cannot exceed 100 characters'),

  body('companySize')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Company size cannot exceed 50 characters'),

  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location cannot exceed 100 characters'),

  body('logo')
    .optional({ checkFalsy: true })
    .trim()
    .isURL({ require_protocol: true })
    .withMessage('Logo must be a valid URL including protocol (e.g., https://example.com/logo.png)'),
];

export const validateEmployerIdParam: ValidationChain[] = [
  param('id')
    .trim()
    .isUUID()
    .withMessage('Employer ID must be a valid UUID'),
];
