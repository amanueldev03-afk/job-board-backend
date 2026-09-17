/// <reference path="../src/types/express.d.ts" />
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import prisma from '../src/lib/prisma';
import { config } from '../src/config';
import { JwtTokenPayload } from '../src/types/auth';

describe('Phase 4: Job Listing Creation & Authorization Test Suite', () => {
  let employerUser: any;
  let employerProfile: any;
  let candidateUser: any;
  let employerWithoutProfileUser: any;
  let anotherEmployerUser: any;
  let anotherEmployerProfile: any;

  let employerToken: string;
  let candidateToken: string;
  let employerWithoutProfileToken: string;
  let anotherEmployerToken: string;

  let createdJobId: string;

  const signToken = (user: any) =>
    jwt.sign(
      { userId: user.id, email: user.email, role: user.role } as JwtTokenPayload,
      config.jwtSecret,
      { expiresIn: '1h' }
    );

  before(async () => {
    // 1. Create Employer with profile
    employerUser = await prisma.user.create({
      data: {
        email: `employer.job.${Date.now()}@test.com`,
        password: 'HashedPassword123!',
        name: 'Tech Recruiter',
        role: 'EMPLOYER',
        employer: {
          create: {
            companyName: `Apex Software ${Date.now()}`,
            companyDescription: 'Modern cloud solutions',
            companyWebsite: 'https://apex.example.com',
            industry: 'Software',
            location: 'Austin, TX',
          },
        },
      },
      include: { employer: true },
    });
    employerProfile = employerUser.employer;

    // 2. Create Candidate
    candidateUser = await prisma.user.create({
      data: {
        email: `candidate.job.${Date.now()}@test.com`,
        password: 'HashedPassword123!',
        name: 'Dev Candidate',
        role: 'CANDIDATE',
        candidate: {
          create: {
            headline: 'Full Stack Engineer',
          },
        },
      },
    });

    // 3. Create Another Employer for ownership tests
    anotherEmployerUser = await prisma.user.create({
      data: {
        email: `another.employer.${Date.now()}@test.com`,
        password: 'HashedPassword123!',
        name: 'Another Recruiter',
        role: 'EMPLOYER',
        employer: {
          create: {
            companyName: `Beta Corp ${Date.now()}`,
            companyDescription: 'Another company',
            companyWebsite: 'https://beta.example.com',
            industry: 'Software',
            location: 'San Francisco, CA',
          },
        },
      },
      include: { employer: true },
    });
    anotherEmployerProfile = anotherEmployerUser.employer;

    // 4. Create Employer User without Employer Profile
    employerWithoutProfileUser = await prisma.user.create({
      data: {
        email: `emp.noprofile.${Date.now()}@test.com`,
        password: 'HashedPassword123!',
        name: 'Empty Profile Recruiter',
        role: 'EMPLOYER',
      },
    });

    employerToken = signToken(employerUser);
    candidateToken = signToken(candidateUser);
    anotherEmployerToken = signToken(anotherEmployerUser);
    employerWithoutProfileToken = signToken(employerWithoutProfileUser);
  });

  after(async () => {
    await prisma.job.deleteMany({
      where: { employerId: { in: [employerProfile.id, anotherEmployerProfile.id] } },
    });
    await prisma.employer.deleteMany({
      where: { id: { in: [employerProfile.id, anotherEmployerProfile.id] } },
    });
    await prisma.candidate.deleteMany({
      where: { userId: candidateUser.id },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [
            employerUser.id,
            candidateUser.id,
            anotherEmployerUser.id,
            employerWithoutProfileUser.id,
          ],
        },
      },
    });
  });

  describe('1. Successful Job Listing Creation (POST /api/v1/jobs)', () => {
    it('should create a complete job listing and return 201 Created', async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          title: 'Senior Backend Engineer (Node.js & PostgreSQL)',
          description:
            'We are looking for an experienced Backend Engineer to design scalable microservices and APIs.',
          requirements: [
            '5+ years Node.js experience',
            'Solid understanding of PostgreSQL & Prisma ORM',
            'Experience with Express.js architecture',
          ],
          responsibilities: [
            'Develop secure REST APIs',
            'Optimize database queries',
            'Collaborate with product and frontend teams',
          ],
          skills: ['Node.js', 'Express', 'TypeScript', 'PostgreSQL', 'Prisma'],
          location: 'Austin, TX',
          isRemote: true,
          jobType: 'FULL_TIME',
          experienceLevel: 'SENIOR',
          salaryMin: 120000,
          salaryMax: 160000,
          currency: 'USD',
          status: 'OPEN',
          deadline: futureDate,
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.id);
      assert.strictEqual(res.body.data.title, 'Senior Backend Engineer (Node.js & PostgreSQL)');
      assert.strictEqual(res.body.data.employerId, employerProfile.id);
      assert.strictEqual(res.body.data.employer.companyName, employerProfile.companyName);
      assert.strictEqual(res.body.data.isRemote, true);
      assert.strictEqual(res.body.data.jobType, 'FULL_TIME');
      assert.strictEqual(res.body.data.experienceLevel, 'SENIOR');
      assert.strictEqual(res.body.data.salaryMin, 120000);
      assert.strictEqual(res.body.data.salaryMax, 160000);
      assert.strictEqual(res.body.data.currency, 'USD');
      assert.strictEqual(res.body.data.status, 'OPEN');
      assert.ok(res.body.data.skills.includes('PostgreSQL'));

      createdJobId = res.body.data.id;
    });

    it('should create a job listing with minimal required fields and appropriate defaults', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          title: 'Junior QA Engineer',
          description: 'Help us automate testing for our core platform and customer portals.',
          location: 'Remote',
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.title, 'Junior QA Engineer');
      assert.strictEqual(res.body.data.isRemote, false);
      assert.strictEqual(res.body.data.jobType, 'FULL_TIME');
      assert.strictEqual(res.body.data.experienceLevel, 'MID');
      assert.strictEqual(res.body.data.status, 'OPEN');
      assert.strictEqual(res.body.data.currency, 'USD');
      assert.deepStrictEqual(res.body.data.requirements, []);
      assert.deepStrictEqual(res.body.data.skills, []);
    });
  });

  describe('2. Input Validation & Error Rejections (POST /api/v1/jobs)', () => {
    it('should reject requests missing required fields (title, description, location) with 400', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({});

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.details);
      assert.ok(res.body.details.some((e: any) => e.field === 'title'));
      assert.ok(res.body.details.some((e: any) => e.field === 'description'));
      assert.ok(res.body.details.some((e: any) => e.field === 'location'));
    });

    it('should reject title < 3 chars or description < 10 chars with 400', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          title: 'No',
          description: 'Short',
          location: 'Remote',
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.details.some((e: any) => e.field === 'title'));
      assert.ok(res.body.details.some((e: any) => e.field === 'description'));
    });

    it('should reject invalid enum values for jobType, experienceLevel, status with 400', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          title: 'Lead Software Architect',
          description: 'Lead engineering architectural decisions across cloud and on-prem systems.',
          location: 'Chicago, IL',
          jobType: 'FREELANCE_GIG',
          experienceLevel: 'UNKNOWN_LEVEL',
          status: 'DELETED',
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.details.some((e: any) => e.field === 'jobType'));
      assert.ok(res.body.details.some((e: any) => e.field === 'experienceLevel'));
      assert.ok(res.body.details.some((e: any) => e.field === 'status'));
    });

    it('should reject minimum salary greater than maximum salary with 400', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          title: 'DevOps Engineer',
          description: 'Manage infrastructure, CI/CD pipelines and deployment automation.',
          location: 'Remote',
          salaryMin: 150000,
          salaryMax: 100000,
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.error, /Minimum salary cannot be greater than maximum salary/);
    });

    it('should reject past deadline date with 400', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          title: 'DevOps Engineer',
          description: 'Manage infrastructure, CI/CD pipelines and deployment automation.',
          location: 'Remote',
          deadline: pastDate,
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.error, /Application deadline must be a future date/);
    });
  });

  describe('3. Role & Authorization Boundaries', () => {
    it('should reject unauthenticated job creation with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .send({
          title: 'Unauthenticated Job Listing',
          description: 'Attempted unauthenticated job listing creation.',
          location: 'Remote',
        });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    it('should forbid CANDIDATE from creating jobs with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          title: 'Candidate Job Listing',
          description: 'Candidate attempting to create a job listing improperly.',
          location: 'Remote',
        });

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.error, /not authorized to access this resource/);
    });

    it('should return 404 if employer user has not created an employer profile', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${employerWithoutProfileToken}`)
        .send({
          title: 'No Profile Employer Job',
          description: 'Valid job description but the user has no employer profile yet.',
          location: 'Remote',
        });

      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.error, /Employer profile not found/);
    });
  });

  describe('4. Job Retrieval Endpoints', () => {
    it('should retrieve employer\'s own jobs via GET /api/v1/jobs/my', async () => {
      const res = await request(app)
        .get('/api/v1/jobs/my')
        .set('Authorization', `Bearer ${employerToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.some((j: any) => j.id === createdJobId));
    });

    it('should retrieve a specific job by valid UUID via GET /api/v1/jobs/:id', async () => {
      const res = await request(app).get(`/api/v1/jobs/${createdJobId}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.id, createdJobId);
      assert.strictEqual(res.body.data.employer.companyName, employerProfile.companyName);
    });

    it('should return 400 for invalid UUID format in param', async () => {
      const res = await request(app).get('/api/v1/jobs/invalid-id-format');

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.details.some((e: any) => e.field === 'id'));
    });

    it('should return 404 for non-existent job UUID', async () => {
      const res = await request(app).get('/api/v1/jobs/00000000-0000-0000-0000-000000000000');

      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
    });
  });

  describe('5. Job Update Authorization (PUT /api/v1/jobs/:id)', () => {
    it('should allow job owner employer to update their job with 200', async () => {
      const res = await request(app)
        .put(`/api/v1/jobs/${createdJobId}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          title: 'Updated Senior Backend Engineer',
          salaryMin: 130000,
          salaryMax: 170000,
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.title, 'Updated Senior Backend Engineer');
      assert.strictEqual(res.body.data.salaryMin, 130000);
      assert.strictEqual(res.body.data.salaryMax, 170000);
    });

    it('should forbid another employer from updating a job with 403', async () => {
      const res = await request(app)
        .put(`/api/v1/jobs/${createdJobId}`)
        .set('Authorization', `Bearer ${anotherEmployerToken}`)
        .send({
          title: 'Hacked Job Title',
        });

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.error, /only update your own job listings/);
    });

    it('should forbid candidates from updating jobs with 403', async () => {
      const res = await request(app)
        .put(`/api/v1/jobs/${createdJobId}`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          title: 'Candidate trying to update',
        });

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
    });

    it('should reject unauthenticated update with 401', async () => {
      const res = await request(app)
        .put(`/api/v1/jobs/${createdJobId}`)
        .send({
          title: 'Unauthenticated update',
        });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    it('should reject invalid salary range on update with 400', async () => {
      const res = await request(app)
        .put(`/api/v1/jobs/${createdJobId}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          salaryMin: 200000,
          salaryMax: 100000,
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.error, /Minimum salary cannot be greater than maximum salary/);
    });

    it('should reject past deadline on update with 400', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .put(`/api/v1/jobs/${createdJobId}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          deadline: pastDate,
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.error, /Application deadline must be a future date/);
    });
  });

  describe('6. Job Delete Authorization (DELETE /api/v1/jobs/:id)', () => {
    let jobToDeleteId: string;

    before(async () => {
      const job = await prisma.job.create({
        data: {
          employerId: employerProfile.id,
          title: 'Job to Delete',
          description: 'This job will be deleted',
          location: 'Remote',
        },
      });
      jobToDeleteId = job.id;
    });

    it('should allow job owner employer to delete their job with 204', async () => {
      const res = await request(app)
        .delete(`/api/v1/jobs/${jobToDeleteId}`)
        .set('Authorization', `Bearer ${employerToken}`);

      assert.strictEqual(res.status, 204);
    });

    it('should forbid another employer from deleting a job with 403', async () => {
      const job = await prisma.job.create({
        data: {
          employerId: employerProfile.id,
          title: 'Protected Job',
          description: 'Only owner can delete',
          location: 'Remote',
        },
      });

      const res = await request(app)
        .delete(`/api/v1/jobs/${job.id}`)
        .set('Authorization', `Bearer ${anotherEmployerToken}`);

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.error, /only delete your own job listings/);

      await prisma.job.delete({ where: { id: job.id } });
    });

    it('should forbid candidates from deleting jobs with 403', async () => {
      const job = await prisma.job.create({
        data: {
          employerId: employerProfile.id,
          title: 'Protected Job',
          description: 'Only owner can delete',
          location: 'Remote',
        },
      });

      const res = await request(app)
        .delete(`/api/v1/jobs/${job.id}`)
        .set('Authorization', `Bearer ${candidateToken}`);

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);

      await prisma.job.delete({ where: { id: job.id } });
    });

    it('should reject unauthenticated delete with 401', async () => {
      const job = await prisma.job.create({
        data: {
          employerId: employerProfile.id,
          title: 'Protected Job',
          description: 'Only owner can delete',
          location: 'Remote',
        },
      });

      const res = await request(app)
        .delete(`/api/v1/jobs/${job.id}`);

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);

      await prisma.job.delete({ where: { id: job.id } });
    });

    it('should return 404 when deleting non-existent job', async () => {
      const res = await request(app)
        .delete('/api/v1/jobs/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${employerToken}`);

      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
    });
  });
});
