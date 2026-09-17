import { describe, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app';
import { config, validateEnv } from '../src/config';
import { AppError } from '../src/middleware/errorHandler';

describe('Phase 0: Express Job Board Backend Test Suite', () => {
  describe('Environment Configuration', () => {
    it('should validate required environment configuration', () => {
      assert.doesNotThrow(() => {
        validateEnv();
      });
      assert.strictEqual(typeof config.port, 'number');
      assert.strictEqual(typeof config.nodeEnv, 'string');
      assert.strictEqual(typeof config.databaseUrl, 'string');
      assert.strictEqual(typeof config.jwtSecret, 'string');
    });
  });

  describe('Health and Status Endpoints', () => {
    it('GET /health should return 200 or 503 with proper health payload structure', async () => {
      const res = await request(app).get('/health');
      assert.ok([200, 503].includes(res.status));
      assert.ok(res.body.status === 'OK' || res.body.status === 'ERROR');
      assert.ok(typeof res.body.uptime === 'number');
      assert.ok(typeof res.body.timestamp === 'string');
      assert.ok(res.body.database === 'connected' || res.body.database === 'disconnected');
    });

    it('GET /api/status should return 200 with API status information', async () => {
      const res = await request(app).get('/api/status');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.message, 'Job Board Platform API is running');
      assert.strictEqual(res.body.version, '1.0.0');
    });
  });

  describe('Centralized Error Handling Foundation', () => {
    it('GET /non-existent-route should return 404 with structured error response', async () => {
      const res = await request(app).get('/api/non-existent-route');
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.error, /Route \/api\/non-existent-route not found/);
    });

    it('should instantiate AppError with custom status codes and operational flag', () => {
      const customError = new AppError('Forbidden action', 403, true);
      assert.strictEqual(customError.message, 'Forbidden action');
      assert.strictEqual(customError.statusCode, 403);
      assert.strictEqual(customError.isOperational, true);
    });
  });
});
