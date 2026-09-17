import { Router } from 'express';
import statusRoutes from './status';
import authRoutes from './authRoutes';

const router = Router();

// Mount v1 feature routes
router.use('/', statusRoutes);
router.use('/auth', authRoutes);

export default router;
