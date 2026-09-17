import { Router, Request, Response } from 'express';
import { config } from '../config';
import prisma from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get(
  '/health',
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({
        status: 'OK',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
        database: 'connected',
      });
    } catch (error) {
      res.status(503).json({
        status: 'ERROR',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
        database: 'disconnected',
        error: config.isDevelopment && error instanceof Error ? error.message : undefined,
      });
    }
  })
);

export default router;
