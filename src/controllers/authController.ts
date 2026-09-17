/// <reference path="../types/express.d.ts" />
import { Request, Response } from 'express';
import { authService } from '../services/authService';
import { sendCreated, sendSuccess } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { UnauthorizedError } from '../middleware/errorHandler';

export const registerCandidate = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.registerCandidate(req.body);

  res.cookie('token', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return sendCreated(res, result, 'Candidate account registered successfully');
});

export const registerEmployer = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.registerEmployer(req.body);

  res.cookie('token', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return sendCreated(res, result, 'Employer account registered successfully');
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);

  res.cookie('token', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return sendSuccess(res, result, 'Login successful');
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const user = await authService.getCurrentUser(req.user.id);
  return sendSuccess(res, user, 'Current user profile retrieved successfully');
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  return sendSuccess(res, { loggedOut: true }, 'Logged out successfully');
});
