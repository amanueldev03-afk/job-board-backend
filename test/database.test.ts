import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import bcrypt from 'bcryptjs';
import prisma from '../src/lib/prisma';

describe('Phase 2: Core Database Schema & Relations Test Suite', () => {
  const testCandidateEmail = `test.candidate.${Date.now()}@example.com`;
  const testEmployerEmail = `test.employer.${Date.now()}@example.com`;
  const testCompanyName = `Test Tech Corp ${Date.now()}`;

  let candidateUserId: string;
  let candidateProfileId: string;
  let employerUserId: string;
  let employerProfileId: string;
  let testJobId: string;
  let testResumeId: string;
  let testApplicationId: string;

  before(async () => {
    // Cleanup any existing test artifacts if needed
  });

  after(async () => {
    // Cleanup test users (cascades to candidate, employer, job, resume, applications)
    if (candidateUserId) {
      await prisma.user.deleteMany({ where: { id: { in: [candidateUserId, employerUserId].filter(Boolean) } } });
    }
  });

  describe('1. User, Candidate, and Employer Creation & Relationships', () => {
    it('should create Candidate User and linked Candidate profile', async () => {
      const password = await bcrypt.hash('Password123!', 10);
      const user = await prisma.user.create({
        data: {
          email: testCandidateEmail,
          password,
          name: 'Jane Candidate',
          role: 'CANDIDATE',
          candidate: {
            create: {
              headline: 'Full Stack TypeScript Engineer',
              skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'Prisma'],
              experienceYears: 4,
              location: 'Remote, US',
            },
          },
        },
        include: {
          candidate: true,
        },
      });

      assert.ok(user.id);
      assert.strictEqual(user.email, testCandidateEmail);
      assert.strictEqual(user.role, 'CANDIDATE');
      assert.ok(user.candidate);
      assert.strictEqual(user.candidate.headline, 'Full Stack TypeScript Engineer');
      assert.deepStrictEqual(user.candidate.skills, ['TypeScript', 'Node.js', 'PostgreSQL', 'Prisma']);

      candidateUserId = user.id;
      candidateProfileId = user.candidate.id;
    });

    it('should create Employer User and linked Employer company profile', async () => {
      const password = await bcrypt.hash('Password123!', 10);
      const user = await prisma.user.create({
        data: {
          email: testEmployerEmail,
          password,
          name: 'Acme Hiring Manager',
          role: 'EMPLOYER',
          employer: {
            create: {
              companyName: testCompanyName,
              companyDescription: 'Innovating developer tooling',
              companyWebsite: 'https://acme-test.example.com',
              industry: 'Technology',
              companySize: '51-200',
              location: 'San Francisco, CA',
            },
          },
        },
        include: {
          employer: true,
        },
      });

      assert.ok(user.id);
      assert.strictEqual(user.role, 'EMPLOYER');
      assert.ok(user.employer);
      assert.strictEqual(user.employer.companyName, testCompanyName);

      employerUserId = user.id;
      employerProfileId = user.employer.id;
    });
  });

  describe('2. Job Listing Creation and Employer Relation', () => {
    it('should create a Job listing linked to Employer', async () => {
      const job = await prisma.job.create({
        data: {
          employerId: employerProfileId,
          title: 'Senior Backend Developer',
          description: 'Build high-performance Express & PostgreSQL microservices',
          requirements: ['5+ years Node.js', 'Strong SQL/PostgreSQL experience'],
          responsibilities: ['Architect APIs', 'Optimize database queries'],
          skills: ['Node.js', 'Express', 'PostgreSQL', 'Prisma'],
          location: 'Remote',
          isRemote: true,
          jobType: 'FULL_TIME',
          experienceLevel: 'SENIOR',
          salaryMin: 120000,
          salaryMax: 160000,
          status: 'OPEN',
        },
        include: {
          employer: true,
        },
      });

      assert.ok(job.id);
      assert.strictEqual(job.title, 'Senior Backend Developer');
      assert.strictEqual(job.jobType, 'FULL_TIME');
      assert.strictEqual(job.status, 'OPEN');
      assert.strictEqual(job.employer.companyName, testCompanyName);

      testJobId = job.id;
    });
  });

  describe('3. Resume and Application Lifecycle', () => {
    it('should create a Resume for Candidate', async () => {
      const resume = await prisma.resume.create({
        data: {
          candidateId: candidateProfileId,
          fileName: 'jane_candidate_resume.pdf',
          fileUrl: 'https://storage.example.com/resumes/jane.pdf',
          fileSize: 1048576,
          mimeType: 'application/pdf',
          isPrimary: true,
        },
      });

      assert.ok(resume.id);
      assert.strictEqual(resume.candidateId, candidateProfileId);
      assert.strictEqual(resume.isPrimary, true);

      testResumeId = resume.id;
    });

    it('should create an Application linking Job, Candidate, and Resume', async () => {
      const appRecord = await prisma.application.create({
        data: {
          jobId: testJobId,
          candidateId: candidateProfileId,
          resumeId: testResumeId,
          coverLetter: 'I am excited to apply for the Senior Backend Developer position.',
          status: 'SUBMITTED',
        },
        include: {
          job: true,
          candidate: true,
          resume: true,
        },
      });

      assert.ok(appRecord.id);
      assert.strictEqual(appRecord.status, 'SUBMITTED');
      assert.strictEqual(appRecord.job.id, testJobId);
      assert.strictEqual(appRecord.candidate.id, candidateProfileId);
      assert.strictEqual(appRecord.resume?.id, testResumeId);

      testApplicationId = appRecord.id;
    });

    it('should prevent duplicate applications from same Candidate to same Job', async () => {
      await assert.rejects(async () => {
        await prisma.application.create({
          data: {
            jobId: testJobId,
            candidateId: candidateProfileId,
            resumeId: testResumeId,
            coverLetter: 'Duplicate application attempt',
          },
        });
      }, /Unique constraint failed/);
    });

    it('should update Application status to SHORTLISTED and INTERVIEW_SCHEDULED', async () => {
      const updated = await prisma.application.update({
        where: { id: testApplicationId },
        data: {
          status: 'SHORTLISTED',
          notes: 'Candidate has strong backend experience.',
        },
      });

      assert.strictEqual(updated.status, 'SHORTLISTED');
      assert.strictEqual(updated.notes, 'Candidate has strong backend experience.');
    });
  });

  describe('4. Notification System Model', () => {
    it('should create an application notification for Employer', async () => {
      const notification = await prisma.notification.create({
        data: {
          userId: employerUserId,
          title: 'New Application Received',
          message: `Jane Candidate applied for Senior Backend Developer`,
          type: 'APPLICATION_RECEIVED',
          metadata: {
            jobId: testJobId,
            applicationId: testApplicationId,
          },
        },
      });

      assert.ok(notification.id);
      assert.strictEqual(notification.userId, employerUserId);
      assert.strictEqual(notification.type, 'APPLICATION_RECEIVED');
      assert.strictEqual(notification.isRead, false);
    });
  });
});
