/// <reference path="../src/types/express.d.ts" />
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../src/lib/prisma';
import { config } from '../src/config';
import {
  authenticate,
  requireCandidate,
  requireEmployer,
  requireAdmin,
  requireCandidateOnly,
  requireEmployerOnly,
} from '../src/middleware/auth';
import {
  requireUserOwnership,
  requireJobOwnership,
  requireApplicationAccess,
  requireResumeAccess,
} from '../src/middleware/authorizeOwnership';
import { authorizationService } from '../src/services/authorizationService';
import { errorHandler, ForbiddenError } from '../src/middleware/errorHandler';
import { JwtTokenPayload } from '../src/types/auth';

describe('Phase 3: Role-Based & Object-Level Authorization Test Suite', () => {
  let candidateAUser: any;
  let candidateACandidate: any;
  let candidateBUser: any;
  let candidateBCandidate: any;
  let employerAUser: any;
  let employerAEmployer: any;
  let employerBUser: any;
  let employerBEmployer: any;
  let adminUser: any;

  let candidateAToken: string;
  let candidateBToken: string;
  let employerAToken: string;
  let employerBToken: string;
  let adminToken: string;

  let jobA: any;
  let jobB: any;
  let resumeA: any;
  let resumeB: any;
  let applicationA: any;
  let notificationA: any;

  const testApp = express();
  testApp.use(express.json());

  // Test routes for role-based authorization
  testApp.get('/api/test/candidate-only', authenticate, requireCandidateOnly, (_req: Request, res: Response) => {
    res.json({ success: true, message: 'Candidate only route accessed' });
  });

  testApp.get('/api/test/employer-only', authenticate, requireEmployerOnly, (_req: Request, res: Response) => {
    res.json({ success: true, message: 'Employer only route accessed' });
  });

  testApp.get('/api/test/candidate-or-admin', authenticate, requireCandidate, (_req: Request, res: Response) => {
    res.json({ success: true, message: 'Candidate or Admin route accessed' });
  });

  testApp.get('/api/test/employer-or-admin', authenticate, requireEmployer, (_req: Request, res: Response) => {
    res.json({ success: true, message: 'Employer or Admin route accessed' });
  });

  testApp.get('/api/test/admin-only', authenticate, requireAdmin, (_req: Request, res: Response) => {
    res.json({ success: true, message: 'Admin only route accessed' });
  });

  // Test routes for object-level authorization & middleware
  testApp.get(
    '/api/test/users/:userId/profile',
    authenticate,
    requireUserOwnership('userId'),
    (_req: Request, res: Response) => {
      res.json({ success: true, message: 'User profile accessed' });
    }
  );

  testApp.put(
    '/api/test/jobs/:jobId',
    authenticate,
    requireJobOwnership('jobId'),
    (_req: Request, res: Response) => {
      res.json({ success: true, message: 'Job updated successfully' });
    }
  );

  testApp.get(
    '/api/test/applications/:applicationId',
    authenticate,
    requireApplicationAccess('applicationId'),
    (_req: Request, res: Response) => {
      res.json({ success: true, message: 'Application accessed successfully' });
    }
  );

  testApp.get(
    '/api/test/resumes/:resumeId',
    authenticate,
    requireResumeAccess('resumeId'),
    (_req: Request, res: Response) => {
      res.json({ success: true, message: 'Resume accessed successfully' });
    }
  );

  testApp.use(errorHandler);

  before(async () => {
    // 1. Create Candidate A
    candidateAUser = await prisma.user.create({
      data: {
        email: `cand.a.${Date.now()}@test.com`,
        password: 'HashedPassword123!',
        name: 'Candidate A',
        role: 'CANDIDATE',
        candidate: {
          create: {
            headline: 'Frontend Engineer',
            location: 'San Francisco, CA',
            skills: ['React', 'TypeScript'],
          },
        },
      },
      include: { candidate: true },
    });
    candidateACandidate = candidateAUser.candidate;

    // 2. Create Candidate B
    candidateBUser = await prisma.user.create({
      data: {
        email: `cand.b.${Date.now()}@test.com`,
        password: 'HashedPassword123!',
        name: 'Candidate B',
        role: 'CANDIDATE',
        candidate: {
          create: {
            headline: 'Backend Engineer',
            location: 'New York, NY',
            skills: ['Node.js', 'PostgreSQL'],
          },
        },
      },
      include: { candidate: true },
    });
    candidateBCandidate = candidateBUser.candidate;

    // 3. Create Employer A
    employerAUser = await prisma.user.create({
      data: {
        email: `emp.a.${Date.now()}@test.com`,
        password: 'HashedPassword123!',
        name: 'Recruiter A',
        role: 'EMPLOYER',
        employer: {
          create: {
            companyName: `Company A ${Date.now()}`,
            industry: 'Technology',
          },
        },
      },
      include: { employer: true },
    });
    employerAEmployer = employerAUser.employer;

    // 4. Create Employer B
    employerBUser = await prisma.user.create({
      data: {
        email: `emp.b.${Date.now()}@test.com`,
        password: 'HashedPassword123!',
        name: 'Recruiter B',
        role: 'EMPLOYER',
        employer: {
          create: {
            companyName: `Company B ${Date.now()}`,
            industry: 'Finance',
          },
        },
      },
      include: { employer: true },
    });
    employerBEmployer = employerBUser.employer;

    // 5. Create Admin User
    adminUser = await prisma.user.create({
      data: {
        email: `admin.${Date.now()}@test.com`,
        password: 'HashedPassword123!',
        name: 'System Admin',
        role: 'ADMIN',
      },
    });

    // Generate JWT Tokens
    const signToken = (user: any) =>
      jwt.sign(
        { userId: user.id, email: user.email, role: user.role } as JwtTokenPayload,
        config.jwtSecret,
        { expiresIn: '1h' }
      );

    candidateAToken = signToken(candidateAUser);
    candidateBToken = signToken(candidateBUser);
    employerAToken = signToken(employerAUser);
    employerBToken = signToken(employerBUser);
    adminToken = signToken(adminUser);

    // Create Job for Employer A
    jobA = await prisma.job.create({
      data: {
        employerId: employerAEmployer.id,
        title: 'Senior Full Stack Engineer',
        description: 'Join Company A to build scalable platforms.',
        location: 'Remote',
        status: 'OPEN',
      },
    });

    // Create Job for Employer B
    jobB = await prisma.job.create({
      data: {
        employerId: employerBEmployer.id,
        title: 'DevOps Engineer',
        description: 'Join Company B to manage infrastructure.',
        location: 'Remote',
        status: 'OPEN',
      },
    });

    // Create Resume for Candidate A
    resumeA = await prisma.resume.create({
      data: {
        candidateId: candidateACandidate.id,
        fileName: 'resume_a.pdf',
        fileUrl: 'https://storage.test.com/resume_a.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
      },
    });

    // Create Resume for Candidate B
    resumeB = await prisma.resume.create({
      data: {
        candidateId: candidateBCandidate.id,
        fileName: 'resume_b.pdf',
        fileUrl: 'https://storage.test.com/resume_b.pdf',
        fileSize: 2048,
        mimeType: 'application/pdf',
      },
    });

    // Candidate A applies to Job A (owned by Employer A) using Resume A
    applicationA = await prisma.application.create({
      data: {
        jobId: jobA.id,
        candidateId: candidateACandidate.id,
        resumeId: resumeA.id,
        coverLetter: 'I would love to work at Company A!',
        status: 'SUBMITTED',
      },
    });

    // Notification for Candidate A
    notificationA = await prisma.notification.create({
      data: {
        userId: candidateAUser.id,
        title: 'Application Received',
        message: 'Your application to Company A was received.',
        type: 'APPLICATION_RECEIVED',
      },
    });
  });

  after(async () => {
    await prisma.notification.deleteMany({
      where: { userId: { in: [candidateAUser.id, candidateBUser.id, employerAUser.id, employerBUser.id, adminUser.id] } },
    });
    await prisma.application.deleteMany({
      where: { jobId: { in: [jobA.id, jobB.id] } },
    });
    await prisma.resume.deleteMany({
      where: { candidateId: { in: [candidateACandidate.id, candidateBCandidate.id] } },
    });
    await prisma.job.deleteMany({
      where: { employerId: { in: [employerAEmployer.id, employerBEmployer.id] } },
    });
    await prisma.candidate.deleteMany({
      where: { id: { in: [candidateACandidate.id, candidateBCandidate.id] } },
    });
    await prisma.employer.deleteMany({
      where: { id: { in: [employerAEmployer.id, employerBEmployer.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [candidateAUser.id, candidateBUser.id, employerAUser.id, employerBUser.id, adminUser.id] } },
    });
  });

  describe('1. Role-Based Route Protection', () => {
    it('should reject unauthenticated requests with 401', async () => {
      const res = await request(testApp).get('/api/test/candidate-only');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    it('should allow CANDIDATE to access candidate-only route', async () => {
      const res = await request(testApp)
        .get('/api/test/candidate-only')
        .set('Authorization', `Bearer ${candidateAToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });

    it('should forbid EMPLOYER from accessing candidate-only route with 403', async () => {
      const res = await request(testApp)
        .get('/api/test/candidate-only')
        .set('Authorization', `Bearer ${employerAToken}`);
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.error, /not authorized to access this resource/);
    });

    it('should allow EMPLOYER to access employer-only route', async () => {
      const res = await request(testApp)
        .get('/api/test/employer-only')
        .set('Authorization', `Bearer ${employerAToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });

    it('should forbid CANDIDATE from accessing employer-only route with 403', async () => {
      const res = await request(testApp)
        .get('/api/test/employer-only')
        .set('Authorization', `Bearer ${candidateAToken}`);
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.error, /not authorized to access this resource/);
    });

    it('should allow ADMIN to access candidate-or-admin and employer-or-admin routes', async () => {
      const resCand = await request(testApp)
        .get('/api/test/candidate-or-admin')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(resCand.status, 200);

      const resEmp = await request(testApp)
        .get('/api/test/employer-or-admin')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(resEmp.status, 200);
    });

    it('should forbid non-ADMIN from accessing admin-only route with 403', async () => {
      const resCand = await request(testApp)
        .get('/api/test/admin-only')
        .set('Authorization', `Bearer ${candidateAToken}`);
      assert.strictEqual(resCand.status, 403);

      const resEmp = await request(testApp)
        .get('/api/test/admin-only')
        .set('Authorization', `Bearer ${employerAToken}`);
      assert.strictEqual(resEmp.status, 403);
    });

    it('should allow ADMIN to access admin-only route', async () => {
      const res = await request(testApp)
        .get('/api/test/admin-only')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });
  });

  describe('2. Client-Provided Role Tampering Prevention', () => {
    it('should ignore client-supplied role in request headers or body and enforce JWT claims', async () => {
      // Candidate A tries to pass an "X-User-Role: ADMIN" header or role body
      const res = await request(testApp)
        .get('/api/test/admin-only')
        .set('Authorization', `Bearer ${candidateAToken}`)
        .set('X-User-Role', 'ADMIN')
        .send({ role: 'ADMIN' });

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
    });
  });

  describe('3. User Ownership Protection', () => {
    it('should allow user to access their own protected profile endpoint', async () => {
      const res = await request(testApp)
        .get(`/api/test/users/${candidateAUser.id}/profile`)
        .set('Authorization', `Bearer ${candidateAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });

    it('should forbid a user from accessing another user\'s profile endpoint with 403', async () => {
      const res = await request(testApp)
        .get(`/api/test/users/${candidateBUser.id}/profile`)
        .set('Authorization', `Bearer ${candidateAToken}`);

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
    });

    it('should allow ADMIN to access any user\'s profile endpoint', async () => {
      const res = await request(testApp)
        .get(`/api/test/users/${candidateBUser.id}/profile`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });
  });

  describe('4. Job Resource Ownership Authorization', () => {
    it('should allow the job creator employer to update their job listing', async () => {
      const res = await request(testApp)
        .put(`/api/test/jobs/${jobA.id}`)
        .set('Authorization', `Bearer ${employerAToken}`)
        .send({ title: 'Updated Job Title' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });

    it('should forbid a different employer from modifying another employer\'s job with 403', async () => {
      const res = await request(testApp)
        .put(`/api/test/jobs/${jobA.id}`)
        .set('Authorization', `Bearer ${employerBToken}`)
        .send({ title: 'Malicious Update' });

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.error, /permission to manage this job listing/);
    });

    it('should forbid candidates from modifying job listings with 403', async () => {
      const res = await request(testApp)
        .put(`/api/test/jobs/${jobA.id}`)
        .set('Authorization', `Bearer ${candidateAToken}`)
        .send({ title: 'Candidate Update' });

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
    });

    it('should allow ADMIN to manage any job listing', async () => {
      const res = await request(testApp)
        .put(`/api/test/jobs/${jobA.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Admin Job Update' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });
  });

  describe('5. Application and Resume Access Authorization', () => {
    it('should allow the applicant candidate to access their own application', async () => {
      const res = await request(testApp)
        .get(`/api/test/applications/${applicationA.id}`)
        .set('Authorization', `Bearer ${candidateAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });

    it('should allow the hiring employer to access applications submitted to their job', async () => {
      const res = await request(testApp)
        .get(`/api/test/applications/${applicationA.id}`)
        .set('Authorization', `Bearer ${employerAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });

    it('should forbid other candidates from accessing someone else\'s application with 403', async () => {
      const res = await request(testApp)
        .get(`/api/test/applications/${applicationA.id}`)
        .set('Authorization', `Bearer ${candidateBToken}`);

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
    });

    it('should forbid other employers from accessing applications submitted to a different company\'s job with 403', async () => {
      const res = await request(testApp)
        .get(`/api/test/applications/${applicationA.id}`)
        .set('Authorization', `Bearer ${employerBToken}`);

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
    });

    it('should allow candidate to access their own resume', async () => {
      const res = await request(testApp)
        .get(`/api/test/resumes/${resumeA.id}`)
        .set('Authorization', `Bearer ${candidateAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });

    it('should allow employer to access resume submitted to their job application', async () => {
      const res = await request(testApp)
        .get(`/api/test/resumes/${resumeA.id}`)
        .set('Authorization', `Bearer ${employerAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });

    it('should forbid employer from accessing a resume not submitted to any of their jobs with 403', async () => {
      const res = await request(testApp)
        .get(`/api/test/resumes/${resumeB.id}`)
        .set('Authorization', `Bearer ${employerAToken}`);

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
    });

    it('should forbid candidate from accessing another candidate\'s resume with 403', async () => {
      const res = await request(testApp)
        .get(`/api/test/resumes/${resumeB.id}`)
        .set('Authorization', `Bearer ${candidateAToken}`);

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
    });
  });

  describe('6. Granular Object-Level Authorization Service Methods', () => {
    it('ensureApplicationStatusUpdateAccess: allows hiring employer and admin, forbids candidate and other employers', async () => {
      // 1. Hiring Employer A -> Allowed
      const appEmpA = await authorizationService.ensureApplicationStatusUpdateAccess(
        applicationA.id,
        { id: employerAUser.id, email: employerAUser.email, role: 'EMPLOYER' }
      );
      assert.strictEqual(appEmpA.id, applicationA.id);

      // 2. Admin -> Allowed
      const appAdmin = await authorizationService.ensureApplicationStatusUpdateAccess(
        applicationA.id,
        { id: adminUser.id, email: adminUser.email, role: 'ADMIN' }
      );
      assert.strictEqual(appAdmin.id, applicationA.id);

      // 3. Other Employer B -> Forbidden
      await assert.rejects(
        authorizationService.ensureApplicationStatusUpdateAccess(
          applicationA.id,
          { id: employerBUser.id, email: employerBUser.email, role: 'EMPLOYER' }
        ),
        ForbiddenError
      );

      // 4. Candidate A -> Forbidden
      await assert.rejects(
        authorizationService.ensureApplicationStatusUpdateAccess(
          applicationA.id,
          { id: candidateAUser.id, email: candidateAUser.email, role: 'CANDIDATE' }
        ),
        ForbiddenError
      );
    });

    it('ensureApplicationWithdrawAccess: allows applicant candidate and admin, forbids other candidates & employers', async () => {
      // 1. Applicant Candidate A -> Allowed
      const appCandA = await authorizationService.ensureApplicationWithdrawAccess(
        applicationA.id,
        { id: candidateAUser.id, email: candidateAUser.email, role: 'CANDIDATE' }
      );
      assert.strictEqual(appCandA.id, applicationA.id);

      // 2. Admin -> Allowed
      const appAdmin = await authorizationService.ensureApplicationWithdrawAccess(
        applicationA.id,
        { id: adminUser.id, email: adminUser.email, role: 'ADMIN' }
      );
      assert.strictEqual(appAdmin.id, applicationA.id);

      // 3. Other Candidate B -> Forbidden
      await assert.rejects(
        authorizationService.ensureApplicationWithdrawAccess(
          applicationA.id,
          { id: candidateBUser.id, email: candidateBUser.email, role: 'CANDIDATE' }
        ),
        ForbiddenError
      );

      // 4. Employer A -> Forbidden
      await assert.rejects(
        authorizationService.ensureApplicationWithdrawAccess(
          applicationA.id,
          { id: employerAUser.id, email: employerAUser.email, role: 'EMPLOYER' }
        ),
        ForbiddenError
      );
    });

    it('ensureNotificationAccess: allows notification owner and admin, forbids other users', async () => {
      // 1. Owner Candidate A -> Allowed
      const notifOwner = await authorizationService.ensureNotificationAccess(
        notificationA.id,
        { id: candidateAUser.id, email: candidateAUser.email, role: 'CANDIDATE' }
      );
      assert.strictEqual(notifOwner.id, notificationA.id);

      // 2. Admin -> Allowed
      const notifAdmin = await authorizationService.ensureNotificationAccess(
        notificationA.id,
        { id: adminUser.id, email: adminUser.email, role: 'ADMIN' }
      );
      assert.strictEqual(notifAdmin.id, notificationA.id);

      // 3. Other User (Candidate B) -> Forbidden
      await assert.rejects(
        authorizationService.ensureNotificationAccess(
          notificationA.id,
          { id: candidateBUser.id, email: candidateBUser.email, role: 'CANDIDATE' }
        ),
        ForbiddenError
      );
    });
  });
});
