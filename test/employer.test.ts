/// <reference path="../src/types/express.d.ts" />
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import prisma from '../src/lib/prisma';
import { config } from '../src/config';
import { JwtTokenPayload } from '../src/types/auth';

describe('Phase 4: Employer Profile APIs Test Suite', () => {
  let employerAUser: any;
  let employerAProfile: any;
  let employerBUser: any;
  let employerBProfile: any;
  let candidateUser: any;
  let adminUser: any;

  let employerAToken: string;
  let employerBToken: string;
  let candidateToken: string;
  let adminToken: string;

  const signToken = (user: any) =>
    jwt.sign(
      { userId: user.id, email: user.email, role: user.role } as JwtTokenPayload,
      config.jwtSecret,
      { expiresIn: '1h' }
    );

  before(async () => {
    // 1. Create Employer A
    employerAUser = await prisma.user.create({
      data: {
        email: `emp.alpha.${Date.now()}@test.com`,
        password: 'HashedPassword123!',
        name: 'John Recruiter',
        role: 'EMPLOYER',
        employer: {
          create: {
            companyName: `Alpha Corp ${Date.now()}`,
            companyDescription: 'Leading tech innovator',
            companyWebsite: 'https://alpha.example.com',
            industry: 'Technology',
            companySize: '51-200',
            location: 'San Francisco, CA',
            logo: 'https://alpha.example.com/logo.png',
          },
        },
      },
      include: { employer: true },
    });
    employerAProfile = employerAUser.employer;

    // 2. Create Employer B
    employerBUser = await prisma.user.create({
      data: {
        email: `emp.beta.${Date.now()}@test.com`,
        password: 'HashedPassword123!',
        name: 'Sarah Recruiter',
        role: 'EMPLOYER',
        employer: {
          create: {
            companyName: `Beta Corp ${Date.now()}`,
            companyDescription: 'Global fintech solutions',
            companyWebsite: 'https://beta.example.com',
            industry: 'Finance',
            companySize: '201-500',
            location: 'New York, NY',
            logo: 'https://beta.example.com/logo.png',
          },
        },
      },
      include: { employer: true },
    });
    employerBProfile = employerBUser.employer;

    // 3. Create Candidate
    candidateUser = await prisma.user.create({
      data: {
        email: `cand.profile.${Date.now()}@test.com`,
        password: 'HashedPassword123!',
        name: 'Alice Developer',
        role: 'CANDIDATE',
        candidate: {
          create: {
            headline: 'Software Engineer',
          },
        },
      },
    });

    // 4. Create Admin
    adminUser = await prisma.user.create({
      data: {
        email: `admin.emp.${Date.now()}@test.com`,
        password: 'HashedPassword123!',
        name: 'Super Admin',
        role: 'ADMIN',
      },
    });

    employerAToken = signToken(employerAUser);
    employerBToken = signToken(employerBUser);
    candidateToken = signToken(candidateUser);
    adminToken = signToken(adminUser);
  });

  after(async () => {
    await prisma.employer.deleteMany({
      where: { id: { in: [employerAProfile.id, employerBProfile.id] } },
    });
    await prisma.candidate.deleteMany({
      where: { userId: candidateUser.id },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [employerAUser.id, employerBUser.id, candidateUser.id, adminUser.id] },
      },
    });
  });

  describe('1. Retrieve Own Employer Profile (GET /api/v1/employers/me)', () => {
    it('should reject unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/employers/me');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    it('should forbid CANDIDATE from accessing employer profile with 403', async () => {
      const res = await request(app)
        .get('/api/v1/employers/me')
        .set('Authorization', `Bearer ${candidateToken}`);

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.error, /not authorized to access this resource/);
    });

    it('should allow authenticated employer to retrieve their own profile', async () => {
      const res = await request(app)
        .get('/api/v1/employers/me')
        .set('Authorization', `Bearer ${employerAToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.id, employerAProfile.id);
      assert.strictEqual(res.body.data.companyName, employerAProfile.companyName);
      assert.strictEqual(res.body.data.industry, 'Technology');
      assert.strictEqual(res.body.data.user.email, employerAUser.email);
      // Ensure password hash is NOT exposed
      assert.strictEqual(res.body.data.user.password, undefined);
      assert.strictEqual(res.body.data.password, undefined);
    });
  });

  describe('2. Update Own Employer Profile (PUT /api/v1/employers/me)', () => {
    it('should fail with 400 when invalid website or logo URL is provided', async () => {
      const res = await request(app)
        .put('/api/v1/employers/me')
        .set('Authorization', `Bearer ${employerAToken}`)
        .send({
          companyWebsite: 'not-a-valid-url',
          logo: 'invalid-logo-url',
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.details);
      assert.ok(res.body.details.some((e: any) => e.field === 'companyWebsite'));
      assert.ok(res.body.details.some((e: any) => e.field === 'logo'));
    });

    it('should forbid CANDIDATE from updating employer profile with 403', async () => {
      const res = await request(app)
        .put('/api/v1/employers/me')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          companyDescription: 'Attempted hack by candidate',
        });

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
    });

    it('should reject company name collision with another employer with 409 Conflict', async () => {
      const res = await request(app)
        .put('/api/v1/employers/me')
        .set('Authorization', `Bearer ${employerAToken}`)
        .send({
          companyName: employerBProfile.companyName,
        });

      assert.strictEqual(res.status, 409);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.error, /already exists/);
    });

    it('should successfully update own profile fields', async () => {
      const updatedDescription = 'Updated innovative tech enterprise';
      const updatedSize = '500-1000';

      const res = await request(app)
        .put('/api/v1/employers/me')
        .set('Authorization', `Bearer ${employerAToken}`)
        .send({
          companyDescription: updatedDescription,
          companySize: updatedSize,
          location: 'San Jose, CA',
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.companyDescription, updatedDescription);
      assert.strictEqual(res.body.data.companySize, updatedSize);
      assert.strictEqual(res.body.data.location, 'San Jose, CA');
      assert.strictEqual(res.body.data.user.password, undefined);
    });
  });

  describe('3. Public Directory & Specific Employer Lookup (GET /api/v1/employers & /:id)', () => {
    it('should list employers with pagination metadata', async () => {
      const res = await request(app).get('/api/v1/employers?page=1&limit=5');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.meta);
      assert.strictEqual(res.body.meta.page, 1);
      assert.strictEqual(res.body.meta.limit, 5);
      assert.ok(res.body.meta.total >= 2);
    });

    it('should filter employers by search keyword', async () => {
      const res = await request(app).get(`/api/v1/employers?search=Alpha`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.some((e: any) => e.id === employerAProfile.id));
    });

    it('should retrieve specific employer profile by valid UUID', async () => {
      const res = await request(app).get(`/api/v1/employers/${employerAProfile.id}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.id, employerAProfile.id);
      assert.strictEqual(res.body.data.companyName, employerAProfile.companyName);
      assert.strictEqual(res.body.data.user.password, undefined);
    });

    it('should fail with 400 when invalid UUID format is provided in param', async () => {
      const res = await request(app).get('/api/v1/employers/invalid-uuid-123');

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.details);
      assert.ok(res.body.details.some((e: any) => e.field === 'id'));
    });

    it('should return 404 for non-existent employer UUID', async () => {
      const res = await request(app).get('/api/v1/employers/00000000-0000-0000-0000-000000000000');

      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
    });
  });

  describe('4. Object-Level Authorization on Update by ID (PUT /api/v1/employers/:id)', () => {
    it('should allow owner employer to update profile by ID', async () => {
      const res = await request(app)
        .put(`/api/v1/employers/${employerAProfile.id}`)
        .set('Authorization', `Bearer ${employerAToken}`)
        .send({
          location: 'Palo Alto, CA',
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.location, 'Palo Alto, CA');
    });

    it('should forbid Employer B from updating Employer A\'s profile with 403', async () => {
      const res = await request(app)
        .put(`/api/v1/employers/${employerAProfile.id}`)
        .set('Authorization', `Bearer ${employerBToken}`)
        .send({
          location: 'Hacked Location',
        });

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.error, /not authorized to manage this employer/);
    });

    it('should forbid Candidate from updating Employer A\'s profile with 403', async () => {
      const res = await request(app)
        .put(`/api/v1/employers/${employerAProfile.id}`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          location: 'Hacked Location',
        });

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
    });

    it('should allow ADMIN to update any employer profile by ID', async () => {
      const res = await request(app)
        .put(`/api/v1/employers/${employerAProfile.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          location: 'Silicon Valley, CA',
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.location, 'Silicon Valley, CA');
    });
  });
});
