import { Router } from 'express';
import statusRoutes from './status';
import authRoutes from './authRoutes';
import employerRoutes from './employerRoutes';
import jobRoutes from './jobRoutes';

const router = Router();

// Mount v1 feature routes
router.use('/', statusRoutes);
router.use('/auth', authRoutes);
router.use('/employers', employerRoutes);
router.use('/jobs', jobRoutes);

export default router;
