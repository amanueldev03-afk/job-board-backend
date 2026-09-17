/// <reference path="../types/express.d.ts" />
import { Request, Response } from 'express';
import { jobService } from '../services/jobService';
import { sendCreated, sendSuccess, sendNoContent, sendPaginated } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { UnauthorizedError } from '../middleware/errorHandler';

export const createJob = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const job = await jobService.createJob(req.user, req.body);
  return sendCreated(res, job, 'Job listing created successfully');
});

export const getJobById = asyncHandler(async (req: Request, res: Response) => {
  const job = await jobService.getJobById(req.params.id as string);
  return sendSuccess(res, job, 'Job listing retrieved successfully');
});

export const getMyJobs = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const jobs = await jobService.getMyJobs(req.user);
  return sendSuccess(res, jobs, 'Employer job listings retrieved successfully');
});

export const updateJob = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const job = await jobService.updateJob(req.user, req.params.id as string, req.body);
  return sendSuccess(res, job, 'Job listing updated successfully');
});

export const deleteJob = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  await jobService.deleteJob(req.user, req.params.id as string);
  return sendNoContent(res);
});

export const searchJobs = asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    keyword: req.query.keyword as string | undefined,
    jobType: req.query.jobType as string | undefined,
    experienceLevel: req.query.experienceLevel as string | undefined,
    location: req.query.location as string | undefined,
    isRemote: req.query.isRemote === 'true' ? true : req.query.isRemote === 'false' ? false : undefined,
    salaryMin: req.query.salaryMin ? parseFloat(req.query.salaryMin as string) : undefined,
    salaryMax: req.query.salaryMax ? parseFloat(req.query.salaryMax as string) : undefined,
    status: req.query.status as string | undefined,
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
  };

  const result = await jobService.searchJobs(filters);
  return sendPaginated(res, result.jobs, result.pagination, 'Job listings retrieved successfully');
});
