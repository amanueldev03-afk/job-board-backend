import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app';
import prisma from '../src/lib/prisma';

describe('Phase 3: Authentication & Authorization Test Suite', () => {
  const timestamp = Date.now();
  const candidateEmail = `candidate.${timestamp}@test.com`;
  const employerEmail = `employer.${timestamp}@test.com`;
  const companyName = `Acme Global ${timestamp}`;
  const password = 'StrongPassword123!';

  let candidateToken: string;
  let employerToken: string;
  let candidateUserId: string;
  let employerUserId: string;

  after(async () => {
    // Cleanup test users (cascades)
    const ids = [candidateUserId, employerUserId].filter(Boolean);
    if (ids.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: ids } },
      });
    }
  });

  describe('1. Candidate Registration (POST /api/v1/auth/register/candidate)', () => {
    it('should fail with 400 when input validation fails', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/candidate')
        .send({
          email: 'not-an-email',
          password: '123',
          name: '',
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'Validation failed');
      assert.ok(Array.isArray(res.body.details));
      assert.ok(res.body.details.length >= 3);
    });

    it('should successfully register a candidate and return 201 with JWT token and no password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/candidate')
        .send({
          email: candidateEmail,
          password: password,
          name: 'Alex Candidate',
          headline: 'Full Stack Engineer',
          location: 'New York, NY',
          skills: ['TypeScript', 'Node.js', 'React'],
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.token);
      assert.ok(res.body.data.user);
      assert.strictEqual(res.body.data.user.email, candidateEmail);
      assert.strictEqual(res.body.data.user.role, 'CANDIDATE');
      assert.strictEqual(res.body.data.user.candidate.headline, 'Full Stack Engineer');
      assert.strictEqual(res.body.data.user.password, undefined);

      candidateToken = res.body.data.token;
      candidateUserId = res.body.data.user.id;

      // Verify password in DB is bcrypt hashed
      const dbUser = await prisma.user.findUnique({ where: { id: candidateUserId } });
      assert.ok(dbUser?.password.startsWith('$2'));
      assert.notStrictEqual(dbUser?.password, password);
    });

    it('should reject duplicate candidate email with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/candidate')
        .send({
          email: candidateEmail,
          password: password,
          name: 'Another Alex',
        });

      assert.strictEqual(res.status, 409);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.error, /already exists/);
    });
  });

  describe('2. Employer Registration (POST /api/v1/auth/register/employer)', () => {
    it('should successfully register an employer and return 201 with JWT token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/employer')
        .send({
          email: employerEmail,
          password: password,
          name: 'Sarah Employer',
          companyName: companyName,
          companyDescription: 'Leading software development firm',
          companyWebsite: 'https://acmeglobal.test.com',
          industry: 'Software',
          companySize: '51-200',
          location: 'San Francisco, CA',
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.token);
      assert.ok(res.body.data.user);
      assert.strictEqual(res.body.data.user.email, employerEmail);
      assert.strictEqual(res.body.data.user.role, 'EMPLOYER');
      assert.strictEqual(res.body.data.user.employer.companyName, companyName);
      assert.strictEqual(res.body.data.user.password, undefined);

      employerToken = res.body.data.token;
      employerUserId = res.body.data.user.id;
    });

    it('should reject duplicate company name with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/employer')
        .send({
          email: `another.${timestamp}@test.com`,
          password: password,
          name: 'John Doe',
          companyName: companyName, // duplicate company name
        });

      assert.strictEqual(res.status, 409);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.error, /already registered/);
    });
  });

  describe('3. Login (POST /api/v1/auth/login)', () => {
    it('should login candidate with valid credentials and set cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: candidateEmail,
          password: password,
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.token);
      assert.strictEqual(res.body.data.user.email, candidateEmail);
      assert.strictEqual(res.body.data.user.password, undefined);

      const cookieHeader = res.headers['set-cookie'] as unknown as string[] | undefined;
      assert.ok(cookieHeader);
      assert.ok(cookieHeader.some((c) => c.includes('token=')));
    });

    it('should reject login with wrong password (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: candidateEmail,
          password: 'WrongPassword123!',
        });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'Invalid email or password');
    });

    it('should reject login with non-existent email (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent.user@example.com',
          password: 'SomePassword123!',
        });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'Invalid email or password');
    });
  });

  describe('4. Authenticated User Profile (GET /api/v1/auth/me)', () => {
    it('should reject request without token (401 Unauthorized)', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.error, /token missing/);
    });

    it('should return Candidate profile with valid candidate token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${candidateToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.id, candidateUserId);
      assert.strictEqual(res.body.data.role, 'CANDIDATE');
      assert.ok(res.body.data.candidate);
      assert.strictEqual(res.body.data.password, undefined);
    });

    it('should return Employer profile with valid employer token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${employerToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.id, employerUserId);
      assert.strictEqual(res.body.data.role, 'EMPLOYER');
      assert.ok(res.body.data.employer);
      assert.strictEqual(res.body.data.employer.companyName, companyName);
      assert.strictEqual(res.body.data.password, undefined);
    });
  });

  describe('5. Logout (POST /api/v1/auth/logout)', () => {
    it('should clear authentication cookie on logout', async () => {
      const res = await request(app).post('/api/v1/auth/logout');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.loggedOut, true);

      const cookieHeader = res.headers['set-cookie'] as unknown as string[] | undefined;
      assert.ok(cookieHeader);
      assert.ok(cookieHeader.some((c) => c.includes('token=;')));
    });
  });
});
