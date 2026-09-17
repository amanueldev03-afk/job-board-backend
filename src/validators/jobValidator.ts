import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const createJobValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Job title is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Job title must be between 3 and 100 characters'),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Job description is required')
    .isLength({ min: 50, max: 5000 })
    .withMessage('Job description must be between 50 and 5000 characters'),
  
  body('requirements')
    .isArray({ min: 1 })
    .withMessage('At least one requirement is required')
    .custom((requirements) => {
      if (!Array.isArray(requirements) || requirements.length === 0) {
        throw new Error('Requirements must be a non-empty array');
      }
      if (requirements.some((req: any) => typeof req !== 'string' || req.trim().length === 0)) {
        throw new Error('All requirements must be non-empty strings');
      }
      return true;
    }),
  
  body('location')
    .trim()
    .notEmpty()
    .withMessage('Job location is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Location must be between 2 and 100 characters'),
  
  body('jobType')
    .trim()
    .notEmpty()
    .withMessage('Job type is required')
    .isIn(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE'])
    .withMessage('Invalid job type. Must be FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP, or REMOTE'),
  
  body('experienceLevel')
    .trim()
    .notEmpty()
    .withMessage('Experience level is required')
    .isIn(['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE'])
    .withMessage('Invalid experience level'),
  
  body('salaryMin')
    .optional()
    .isNumeric()
    .withMessage('Minimum salary must be a number')
    .isFloat({ min: 0 })
    .withMessage('Minimum salary must be positive'),
  
  body('salaryMax')
    .optional()
    .isNumeric()
    .withMessage('Maximum salary must be a number')
    .isFloat({ min: 0 })
    .withMessage('Maximum salary must be positive')
    .custom((value, { req }) => {
      if (req.body.salaryMin && value && parseFloat(value) < parseFloat(req.body.salaryMin)) {
        throw new Error('Maximum salary must be greater than or equal to minimum salary');
      }
      return true;
    }),
  
  body('skills')
    .isArray({ min: 1 })
    .withMessage('At least one skill is required')
    .custom((skills) => {
      if (!Array.isArray(skills) || skills.length === 0) {
        throw new Error('Skills must be a non-empty array');
      }
      if (skills.some((skill: any) => typeof skill !== 'string' || skill.trim().length === 0)) {
        throw new Error('All skills must be non-empty strings');
      }
      return true;
    }),
  
  body('deadline')
    .notEmpty()
    .withMessage('Application deadline is required')
    .isISO8601()
    .withMessage('Deadline must be a valid ISO 8601 date')
    .custom((value) => {
      const deadline = new Date(value);
      const now = new Date();
      if (deadline <= now) {
        throw new Error('Deadline must be in the future');
      }
      return true;
    }),
];

export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      errors: errors.array().map((err) => ({
        field: (err as any).path,
        message: err.msg,
      })),
    });
    return;
  }
  next();
};
