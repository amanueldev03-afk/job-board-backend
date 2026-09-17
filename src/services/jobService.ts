import { AuthUser } from '../types/auth';
import { CreateJobDto, UpdateJobDto } from '../types/job';
import { jobRepository, JobRepository } from '../repositories/jobRepository';
import { employerRepository, EmployerRepository } from '../repositories/employerRepository';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../middleware/errorHandler';

export class JobService {
  constructor(
    private readonly jobRepo: JobRepository = jobRepository,
    private readonly employerRepo: EmployerRepository = employerRepository
  ) {}

  /**
   * Create a new job listing for the authenticated employer.
   */
  public async createJob(currentUser: AuthUser, data: CreateJobDto) {
    if (currentUser.role !== 'EMPLOYER' && currentUser.role !== 'ADMIN') {
      throw new ForbiddenError('Only employers can post job listings');
    }

    const employer = await this.employerRepo.findByUserId(currentUser.id);
    if (!employer) {
      throw new NotFoundError(
        'Employer profile not found. Please complete your employer profile before posting jobs.'
      );
    }

    // Business validation: salary range
    if (
      data.salaryMin !== undefined &&
      data.salaryMax !== undefined &&
      data.salaryMin !== null &&
      data.salaryMax !== null &&
      data.salaryMin > data.salaryMax
    ) {
      throw new BadRequestError('Minimum salary cannot be greater than maximum salary');
    }

    // Business validation: deadline
    if (data.deadline) {
      const deadlineDate = new Date(data.deadline);
      if (isNaN(deadlineDate.getTime())) {
        throw new BadRequestError('Invalid deadline date format');
      }
      if (deadlineDate <= new Date()) {
        throw new BadRequestError('Application deadline must be a future date');
      }
    }

    return this.jobRepo.create(employer.id, data);
  }

  /**
   * Retrieve a job by its unique ID.
   */
  public async getJobById(id: string) {
    const job = await this.jobRepo.findById(id);
    if (!job) {
      throw new NotFoundError('Job listing not found');
    }

    return job;
  }

  /**
   * Retrieve all jobs created by the authenticated employer.
   */
  public async getMyJobs(currentUser: AuthUser) {
    if (currentUser.role !== 'EMPLOYER' && currentUser.role !== 'ADMIN') {
      throw new ForbiddenError('Only employers can access their job listings');
    }

    const employer = await this.employerRepo.findByUserId(currentUser.id);
    if (!employer) {
      throw new NotFoundError('Employer profile not found');
    }

    return this.jobRepo.findByEmployerId(employer.id);
  }

  /**
   * Update a job listing. Only the job owner (employer) or admin can update.
   */
  public async updateJob(currentUser: AuthUser, jobId: string, data: UpdateJobDto) {
    if (currentUser.role !== 'EMPLOYER' && currentUser.role !== 'ADMIN') {
      throw new ForbiddenError('Only employers can update job listings');
    }

    const job = await this.jobRepo.findByIdWithEmployer(jobId);
    if (!job) {
      throw new NotFoundError('Job listing not found');
    }

    // Check ownership: employers can only update their own jobs
    if (currentUser.role === 'EMPLOYER') {
      const employer = await this.employerRepo.findByUserId(currentUser.id);
      if (!employer) {
        throw new NotFoundError('Employer profile not found');
      }
      if (job.employerId !== employer.id) {
        throw new ForbiddenError('You can only update your own job listings');
      }
    }

    // Business validation: salary range
    if (
      data.salaryMin !== undefined &&
      data.salaryMax !== undefined &&
      data.salaryMin !== null &&
      data.salaryMax !== null &&
      data.salaryMin > data.salaryMax
    ) {
      throw new BadRequestError('Minimum salary cannot be greater than maximum salary');
    }

    // Business validation: deadline
    if (data.deadline) {
      const deadlineDate = new Date(data.deadline);
      if (isNaN(deadlineDate.getTime())) {
        throw new BadRequestError('Invalid deadline date format');
      }
      if (deadlineDate <= new Date()) {
        throw new BadRequestError('Application deadline must be a future date');
      }
    }

    return this.jobRepo.updateById(jobId, data);
  }

  /**
   * Delete a job listing. Only the job owner (employer) or admin can delete.
   */
  public async deleteJob(currentUser: AuthUser, jobId: string) {
    if (currentUser.role !== 'EMPLOYER' && currentUser.role !== 'ADMIN') {
      throw new ForbiddenError('Only employers can delete job listings');
    }

    const job = await this.jobRepo.findByIdWithEmployer(jobId);
    if (!job) {
      throw new NotFoundError('Job listing not found');
    }

    // Check ownership: employers can only delete their own jobs
    if (currentUser.role === 'EMPLOYER') {
      const employer = await this.employerRepo.findByUserId(currentUser.id);
      if (!employer) {
        throw new NotFoundError('Employer profile not found');
      }
      if (job.employerId !== employer.id) {
        throw new ForbiddenError('You can only delete your own job listings');
      }
    }

    await this.jobRepo.deleteById(jobId);
  }
}

export const jobService = new JobService();
export default jobService;
