import { Router } from 'express';
import statusRoutes from './status';
import authRoutes from './authRoutes';
import employerRoutes from './employerRoutes';

const router = Router();

// Mount v1 feature routes
router.use('/', statusRoutes);
router.use('/auth', authRoutes);
router.use('/employers', employerRoutes);

export default router;
