import { AuthUser } from '../types/auth';
import { ForbiddenError, NotFoundError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';

export class AuthorizationService {
  /**
   * General purpose ownership verification.
   * Allows access if currentUser is an ADMIN or if current user ID matches resource owner's user ID.
   */
  public ensureUserOwnership(
    resourceOwnerUserId: string,
    currentUser: AuthUser,
    customErrorMessage?: string
  ): void {
    if (currentUser.role === 'ADMIN') {
      return;
    }

    if (currentUser.id !== resourceOwnerUserId) {
      throw new ForbiddenError(
        customErrorMessage || 'You do not have permission to access or modify this resource'
      );
    }
  }

  /**
   * Verify whether the user can manage (update/delete) an employer profile.
   */
  public async ensureEmployerOwnership(
    employerId: string,
    currentUser: AuthUser
  ): Promise<{ id: string; userId: string }> {
    const employer = await prisma.employer.findUnique({
      where: { id: employerId },
      select: { id: true, userId: true },
    });

    if (!employer) {
      throw new NotFoundError('Employer profile not found');
    }

    this.ensureUserOwnership(
      employer.userId,
      currentUser,
      'You are not authorized to manage this employer company profile'
    );

    return employer;
  }

  /**
   * Verify whether the user can manage (update/delete) a candidate profile.
   */
  public async ensureCandidateOwnership(
    candidateId: string,
    currentUser: AuthUser
  ): Promise<{ id: string; userId: string }> {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { id: true, userId: true },
    });

    if (!candidate) {
      throw new NotFoundError('Candidate profile not found');
    }

    this.ensureUserOwnership(
      candidate.userId,
      currentUser,
      'You are not authorized to manage this candidate profile'
    );

    return candidate;
  }

  /**
   * Verify whether the user can manage (edit, close, delete) a job listing.
   * Only the owning Employer (or ADMIN) can manage the job.
   */
  public async ensureJobOwnership(jobId: string, currentUser: AuthUser) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        employer: {
          select: { id: true, userId: true, companyName: true },
        },
      },
    });

    if (!job) {
      throw new NotFoundError('Job listing not found');
    }

    if (currentUser.role === 'ADMIN') {
      return job;
    }

    if (currentUser.role !== 'EMPLOYER' || job.employer.userId !== currentUser.id) {
      throw new ForbiddenError('You do not have permission to manage this job listing');
    }

    return job;
  }

  /**
   * Verify whether the user can access/view a resume.
   * - ADMIN can view any resume.
   * - Candidate who owns the resume can view/modify/delete it.
   * - Employer can view only if the candidate has applied with this resume to a job posted by this employer.
   */
  public async ensureResumeAccess(resumeId: string, currentUser: AuthUser) {
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        candidate: {
          select: { id: true, userId: true },
        },
        applications: {
          include: {
            job: {
              include: {
                employer: {
                  select: { id: true, userId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!resume) {
      throw new NotFoundError('Resume not found');
    }

    if (currentUser.role === 'ADMIN') {
      return resume;
    }

    // Owner candidate access
    if (resume.candidate.userId === currentUser.id) {
      return resume;
    }

    // Employer access: allowed if attached to an application for one of their jobs
    if (currentUser.role === 'EMPLOYER') {
      const hasApplicationForEmployer = resume.applications.some(
        (app: { job: { employer: { userId: string } } }) =>
          app.job.employer.userId === currentUser.id
      );

      if (hasApplicationForEmployer) {
        return resume;
      }
    }

    throw new ForbiddenError('You do not have permission to access this resume');
  }

  /**
   * Verify whether the candidate can delete or modify their resume.
   * Only the candidate owner or ADMIN can modify/delete the resume.
   */
  public async ensureResumeOwnership(resumeId: string, currentUser: AuthUser) {
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        candidate: {
          select: { id: true, userId: true },
        },
      },
    });

    if (!resume) {
      throw new NotFoundError('Resume not found');
    }

    if (currentUser.role === 'ADMIN') {
      return resume;
    }

    if (resume.candidate.userId !== currentUser.id) {
      throw new ForbiddenError('You do not have permission to modify or delete this resume');
    }

    return resume;
  }

  /**
   * Verify whether the user can access an application.
   * - ADMIN can view any application.
   * - The applicant candidate can view their own application.
   * - The employer who posted the job can view the application.
   */
  public async ensureApplicationAccess(applicationId: string, currentUser: AuthUser) {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        candidate: {
          select: { id: true, userId: true },
        },
        job: {
          include: {
            employer: {
              select: { id: true, userId: true, companyName: true },
            },
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    if (currentUser.role === 'ADMIN') {
      return application;
    }

    if (application.candidate.userId === currentUser.id) {
      return application;
    }

    if (application.job.employer.userId === currentUser.id) {
      return application;
    }

    throw new ForbiddenError('You do not have permission to access this application');
  }

  /**
   * Verify whether the user can update the status of an application.
   * Only the Employer who owns the job (or ADMIN) can update application status (e.g. SHORTLISTED, REJECTED).
   */
  public async ensureApplicationStatusUpdateAccess(applicationId: string, currentUser: AuthUser) {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: {
          include: {
            employer: {
              select: { id: true, userId: true },
            },
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    if (currentUser.role === 'ADMIN') {
      return application;
    }

    if (currentUser.role !== 'EMPLOYER' || application.job.employer.userId !== currentUser.id) {
      throw new ForbiddenError('Only the hiring employer can update application status');
    }

    return application;
  }

  /**
   * Verify whether the user can withdraw an application.
   * Only the Candidate who applied (or ADMIN) can withdraw the application.
   */
  public async ensureApplicationWithdrawAccess(applicationId: string, currentUser: AuthUser) {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        candidate: {
          select: { id: true, userId: true },
        },
      },
    });

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    if (currentUser.role === 'ADMIN') {
      return application;
    }

    if (currentUser.role !== 'CANDIDATE' || application.candidate.userId !== currentUser.id) {
      throw new ForbiddenError('You can only withdraw your own applications');
    }

    return application;
  }

  /**
   * Verify whether the user can access a notification.
   */
  public async ensureNotificationAccess(notificationId: string, currentUser: AuthUser) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    this.ensureUserOwnership(
      notification.userId,
      currentUser,
      'You do not have permission to access this notification'
    );

    return notification;
  }
}

export const authorizationService = new AuthorizationService();
export default authorizationService;
