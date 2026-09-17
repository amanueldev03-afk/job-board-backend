import { Router } from 'express';
import {
  registerCandidate,
  registerEmployer,
  login,
  getMe,
  logout,
} from '../../controllers/authController';
import {
  registerCandidateValidator,
  registerEmployerValidator,
  loginValidator,
} from '../../validators/authValidators';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';

const router = Router();

// Candidate registration
router.post(
  '/register/candidate',
  validate(registerCandidateValidator),
  registerCandidate
);

// Employer registration
router.post(
  '/register/employer',
  validate(registerEmployerValidator),
  registerEmployer
);

// User login
router.post('/login', validate(loginValidator), login);

// Get current authenticated user profile
router.get('/me', authenticate, getMe);

// User logout
router.post('/logout', logout);

export default router;
