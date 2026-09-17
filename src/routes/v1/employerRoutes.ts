import { Router } from 'express';
import {
  getMyProfile,
  updateMyProfile,
  getEmployerById,
  updateEmployerById,
  listEmployers,
} from '../../controllers/employerController';
import { authenticate, requireEmployer } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  validateUpdateEmployerProfile,
  validateEmployerIdParam,
} from '../../validators/employerValidators';

const router = Router();

// 1. Current employer profile endpoints
router.get('/me', authenticate, requireEmployer, getMyProfile);
router.put('/me', authenticate, requireEmployer, validate(validateUpdateEmployerProfile), updateMyProfile);

// 2. Public / Shared directory endpoints
router.get('/', listEmployers);
router.get('/:id', validate(validateEmployerIdParam), getEmployerById);

// 3. Update employer profile by ID (guarded with object-level auth)
router.put(
  '/:id',
  authenticate,
  requireEmployer,
  validate([...validateEmployerIdParam, ...validateUpdateEmployerProfile]),
  updateEmployerById
);

export default router;
