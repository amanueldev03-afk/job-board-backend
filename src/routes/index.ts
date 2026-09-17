import { Router } from 'express';
import healthRoutes from './health';
import v1Routes from './v1';

const router = Router();

// Health check endpoint at root
router.use('/', healthRoutes);

// Versioned API routes
router.use('/api/v1', v1Routes);

export default router;
