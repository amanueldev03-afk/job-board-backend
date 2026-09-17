/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from './errorHandler';
import { authorizationService } from '../services/authorizationService';

const extractParamString = (req: Request, paramKey: string): string | null => {
  const val = req.params[paramKey] ?? req.params.id;
  if (!val) return null;
  return Array.isArray(val) ? val[0] : val;
};

/**
 * Middleware factory to verify that the authenticated user matches the target userId param,
 * or possesses the ADMIN role.
 */
export const requireUserOwnership = (paramKey = 'userId') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    const targetUserId = extractParamString(req, paramKey);
    if (!targetUserId) {
      next();
      return;
    }

    try {
      authorizationService.ensureUserOwnership(targetUserId, req.user);
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Middleware to verify that the authenticated user is the employer who created the job or an ADMIN.
 */
export const requireJobOwnership = (paramKey = 'jobId') => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    const jobId = extractParamString(req, paramKey);
    if (!jobId) {
      next();
      return;
    }

    try {
      await authorizationService.ensureJobOwnership(jobId, req.user);
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Middleware to verify that the authenticated user can access the specified application
 * (either the applicant candidate, the employer whose job it is, or an ADMIN).
 */
export const requireApplicationAccess = (paramKey = 'applicationId') => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    const applicationId = extractParamString(req, paramKey);
    if (!applicationId) {
      next();
      return;
    }

    try {
      await authorizationService.ensureApplicationAccess(applicationId, req.user);
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Middleware to verify that the authenticated user can access the specified resume.
 */
export const requireResumeAccess = (paramKey = 'resumeId') => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    const resumeId = extractParamString(req, paramKey);
    if (!resumeId) {
      next();
      return;
    }

    try {
      await authorizationService.ensureResumeAccess(resumeId, req.user);
      next();
    } catch (err) {
      next(err);
    }
  };
};
