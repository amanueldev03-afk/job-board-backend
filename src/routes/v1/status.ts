import { Router, Request, Response } from 'express';
import { config } from '../../config';
import { sendSuccess } from '../../utils/response';

const router = Router();

router.get('/status', (_req: Request, res: Response) => {
  sendSuccess(
    res,
    {
      service: 'Job Board Platform API',
      version: '1.0.0',
      apiVersion: 'v1',
      environment: config.nodeEnv,
    },
    'API v1 is operational'
  );
});

export default router;
