import { Router, Request, Response } from 'express';
import { config } from '../config';
import { checkDatabaseConnection } from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get(
  '/health',
  asyncHandler(async (_req: Request, res: Response) => {
    const dbHealth = await checkDatabaseConnection();

    if (dbHealth.connected) {
      res.status(200).json({
        status: 'OK',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
        database: 'connected',
        latencyMs: dbHealth.latencyMs,
      });
    } else {
      res.status(503).json({
        status: 'ERROR',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
        database: 'disconnected',
        error: config.isDevelopment ? dbHealth.error : undefined,
      });
    }
  })
);

export default router;
