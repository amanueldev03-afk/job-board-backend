/// <reference path="../types/express.d.ts" />
import { Request, Response } from 'express';
import { employerService } from '../services/employerService';
import { sendSuccess, sendPaginated } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { UnauthorizedError } from '../middleware/errorHandler';

export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const employer = await employerService.getOwnProfile(req.user);
  return sendSuccess(res, employer, 'Employer profile retrieved successfully');
});

export const updateMyProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const employer = await employerService.updateOwnProfile(req.user, req.body);
  return sendSuccess(res, employer, 'Employer profile updated successfully');
});

export const getEmployerById = asyncHandler(async (req: Request, res: Response) => {
  const employer = await employerService.getEmployerById(req.params.id as string);
  return sendSuccess(res, employer, 'Employer details retrieved successfully');
});

export const updateEmployerById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const employer = await employerService.updateEmployerById(
    req.params.id as string,
    req.user,
    req.body
  );
  return sendSuccess(res, employer, 'Employer profile updated successfully');
});

export const listEmployers = asyncHandler(async (req: Request, res: Response) => {
  const result = await employerService.listEmployers(req.query);
  return sendPaginated(
    res,
    result.employers,
    result.pagination,
    'Employers retrieved successfully'
  );
});
