import { Router } from 'express';
import statusRoutes from './status';

const router = Router();

// Mount v1 feature routes
router.use('/', statusRoutes);

export default router;
