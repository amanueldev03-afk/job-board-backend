import { Router, Request, Response } from 'express';
import { config } from '../config';
import prisma from '../lib/prisma';

const router = Router();

// Health check endpoint
router.get('/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
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
});

// API Status endpoint
router.get('/api/status', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Job Board Platform API is running',
    version: '1.0.0',
    environment: config.nodeEnv,
  });
});

export default router;
