import { Router } from 'express';
import { createJob, getJobById, getMyJobs, updateJob, deleteJob } from '../../controllers/jobController';
import { authenticate, requireEmployer } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { validateCreateJob, validateUpdateJob, validateJobIdParam } from '../../validators/jobValidators';

const router = Router();

// 1. Employer job creation
router.post('/', authenticate, requireEmployer, validate(validateCreateJob), createJob);

// 2. Employer retrieval of own jobs
router.get('/my', authenticate, requireEmployer, getMyJobs);

// 3. Job detail lookup by ID (public)
router.get('/:id', validate(validateJobIdParam), getJobById);

// 4. Update job by ID (employer only)
router.put('/:id', authenticate, requireEmployer, validate(validateJobIdParam), validate(validateUpdateJob), updateJob);

// 5. Delete job by ID (employer only)
router.delete('/:id', authenticate, requireEmployer, validate(validateJobIdParam), deleteJob);

export default router;
