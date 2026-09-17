/// <reference path="../src/types/express.d.ts" />
import { describe, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import express, { Request, Response } from 'express';
import { body } from 'express-validator';
import app from '../src/app';
import { config, validateEnv } from '../src/config';
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  errorHandler,
  notFoundHandler,
} from '../src/middleware/errorHandler';
import { validate } from '../src/middleware/validate';
import { authenticate, requireRole, optionalAuth } from '../src/middleware/auth';
import { asyncHandler } from '../src/utils/asyncHandler';
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendNoContent,
} from '../src/utils/response';
import { JwtTokenPayload } from '../src/types/auth';

import { checkDatabaseConnection } from '../src/lib/prisma';

describe('Job Board Platform Modular Architecture Test Suite', () => {
  describe('1. Environment & Database Configuration', () => {
    it('should validate environment variables successfully', () => {
      assert.doesNotThrow(() => {
        validateEnv();
      });
      assert.strictEqual(typeof config.port, 'number');
      assert.strictEqual(typeof config.nodeEnv, 'string');
      assert.strictEqual(typeof config.databaseUrl, 'string');
      assert.strictEqual(typeof config.jwtSecret, 'string');
    });

    it('should fail validation when DATABASE_URL has invalid protocol', () => {
      const originalDbUrl = process.env.DATABASE_URL;
      try {
        process.env.DATABASE_URL = 'mongodb://localhost:27017/job_board';
        assert.throws(
          () => validateEnv(),
          /Invalid DATABASE_URL protocol/
        );
      } finally {
        process.env.DATABASE_URL = originalDbUrl;
      }
    });

    it('should perform database connection health check', async () => {
      const dbStatus = await checkDatabaseConnection();
      assert.strictEqual(typeof dbStatus.connected, 'boolean');
      if (dbStatus.connected) {
        assert.strictEqual(typeof dbStatus.latencyMs, 'number');
      } else {
        assert.strictEqual(typeof dbStatus.error, 'string');
      }
    });
  });

  describe('2. Core and Versioned API Endpoints', () => {
    it('GET /health should return 200 or 503 with standardized health payload', async () => {
      const res = await request(app).get('/health');
      assert.ok([200, 503].includes(res.status));
      assert.ok(res.body.status === 'OK' || res.body.status === 'ERROR');
      assert.ok(typeof res.body.uptime === 'number');
      assert.ok(typeof res.body.timestamp === 'string');
      assert.ok(res.body.database === 'connected' || res.body.database === 'disconnected');
    });

    it('GET /api/v1/status should return 200 with standard versioned response structure', async () => {
      const res = await request(app).get('/api/v1/status');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.apiVersion, 'v1');
      assert.strictEqual(res.body.data.service, 'Job Board Platform API');
    });
  });

  describe('3. Centralized 404 & Error Handling Foundation', () => {
    it('GET /api/v1/unknown should return 404 with standard error JSON format', async () => {
      const res = await request(app).get('/api/v1/unknown');
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.error, /Route GET \/api\/v1\/unknown not found/);
    });

    it('should construct specialized AppError classes properly', () => {
      const notFound = new NotFoundError('Job posting not found');
      assert.strictEqual(notFound.statusCode, 404);
      assert.strictEqual(notFound.message, 'Job posting not found');

      const badReq = new BadRequestError('Invalid input', [{ field: 'title', message: 'required' }]);
      assert.strictEqual(badReq.statusCode, 400);
      assert.strictEqual(Array.isArray(badReq.details), true);

      const unauth = new UnauthorizedError('Invalid credentials');
      assert.strictEqual(unauth.statusCode, 401);

      const forbidden = new ForbiddenError('Permission denied');
      assert.strictEqual(forbidden.statusCode, 403);

      const conflict = new ConflictError('User email already exists');
      assert.strictEqual(conflict.statusCode, 409);
    });
  });

  describe('4. Consistent Response Format Utilities', () => {
    const testApp = express();
    testApp.use(express.json());

    testApp.get('/test/success', (_req: Request, res: Response) => {
      sendSuccess(res, { item: 'sample' }, 'Item fetched');
    });

    testApp.get('/test/created', (_req: Request, res: Response) => {
      sendCreated(res, { id: '123' }, 'Item created');
    });

    testApp.get('/test/paginated', (_req: Request, res: Response) => {
      sendPaginated(
        res,
        [{ id: 1 }, { id: 2 }],
        {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
        'Items retrieved'
      );
    });

    testApp.get('/test/no-content', (_req: Request, res: Response) => {
      sendNoContent(res);
    });

    it('sendSuccess should format 200 response with success, data, and message', async () => {
      const res = await request(testApp).get('/test/success');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.message, 'Item fetched');
      assert.deepStrictEqual(res.body.data, { item: 'sample' });
    });

    it('sendCreated should format 201 response', async () => {
      const res = await request(testApp).get('/test/created');
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.message, 'Item created');
      assert.deepStrictEqual(res.body.data, { id: '123' });
    });

    it('sendPaginated should format 200 response with pagination metadata', async () => {
      const res = await request(testApp).get('/test/paginated');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.length, 2);
      assert.strictEqual(res.body.meta.page, 1);
      assert.strictEqual(res.body.meta.total, 2);
    });

    it('sendNoContent should return 204 status', async () => {
      const res = await request(testApp).get('/test/no-content');
      assert.strictEqual(res.status, 204);
    });
  });

  describe('5. Request Validation Middleware Foundation', () => {
    const testApp = express();
    testApp.use(express.json());

    const testValidations = [
      body('email').isEmail().withMessage('Valid email required'),
      body('title').trim().notEmpty().withMessage('Job title cannot be empty'),
    ];

    testApp.post(
      '/test/validate',
      validate(testValidations),
      (_req: Request, res: Response) => {
        res.json({ success: true });
      }
    );

    testApp.use(errorHandler);

    it('should reject invalid payloads with 400 and structured validation details', async () => {
      const res = await request(testApp)
        .post('/test/validate')
        .send({ email: 'invalid-email', title: '' });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'Validation failed');
      assert.ok(Array.isArray(res.body.details));
      assert.strictEqual(res.body.details.length, 2);
    });

    it('should pass valid payloads to the next handler', async () => {
      const res = await request(testApp)
        .post('/test/validate')
        .send({ email: 'test@example.com', title: 'Software Engineer' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });
  });

  describe('6. Authentication and Role-based Authorization Foundation', () => {
    const testApp = express();
    testApp.use(express.json());

    const sampleCandidateToken = jwt.sign(
      { userId: 'user-cand-1', email: 'candidate@test.com', role: 'CANDIDATE' } as JwtTokenPayload,
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    const sampleEmployerToken = jwt.sign(
      { userId: 'user-emp-1', email: 'employer@test.com', role: 'EMPLOYER' } as JwtTokenPayload,
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    testApp.get('/test/auth-required', authenticate, (req: Request, res: Response) => {
      res.json({ success: true, user: req.user });
    });

    testApp.get(
      '/test/employer-only',
      authenticate,
      requireRole('EMPLOYER', 'ADMIN'),
      (_req: Request, res: Response) => {
        res.json({ success: true, employerAccess: true });
      }
    );

    testApp.get('/test/optional-auth', optionalAuth, (req: Request, res: Response) => {
      res.json({ success: true, user: req.user || null });
    });

    testApp.use(errorHandler);

    it('should reject requests without token on protected route with 401', async () => {
      const res = await request(testApp).get('/test/auth-required');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'Authentication token missing');
    });

    it('should authenticate requests with valid Bearer token', async () => {
      const res = await request(testApp)
        .get('/test/auth-required')
        .set('Authorization', `Bearer ${sampleCandidateToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.user?.id, 'user-cand-1');
      assert.strictEqual(res.body.user?.role, 'CANDIDATE');
    });

    it('should forbid CANDIDATE from accessing EMPLOYER-only endpoints with 403', async () => {
      const res = await request(testApp)
        .get('/test/employer-only')
        .set('Authorization', `Bearer ${sampleCandidateToken}`);

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.error, /not authorized to access this resource/);
    });

    it('should allow EMPLOYER to access EMPLOYER-only endpoints', async () => {
      const res = await request(testApp)
        .get('/test/employer-only')
        .set('Authorization', `Bearer ${sampleEmployerToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.employerAccess, true);
    });

    it('optionalAuth should populate user when token is provided and null when absent', async () => {
      const resNoToken = await request(testApp).get('/test/optional-auth');
      assert.strictEqual(resNoToken.status, 200);
      assert.strictEqual(resNoToken.body.user, null);

      const resWithToken = await request(testApp)
        .get('/test/optional-auth')
        .set('Authorization', `Bearer ${sampleEmployerToken}`);
      assert.strictEqual(resWithToken.status, 200);
      assert.strictEqual(resWithToken.body.user?.id, 'user-emp-1');
    });
  });

  describe('7. Asynchronous Controller Error Handling', () => {
    const testApp = express();

    testApp.get(
      '/test/async-error',
      asyncHandler(async () => {
        throw new BadRequestError('Async controller thrown error');
      })
    );

    testApp.use(notFoundHandler);
    testApp.use(errorHandler);

    it('asyncHandler should catch promise rejections and forward to global errorHandler', async () => {
      const res = await request(testApp).get('/test/async-error');
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'Async controller thrown error');
    });
  });
});
