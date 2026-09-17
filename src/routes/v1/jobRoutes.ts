import { Router } from 'express';
import { createJob, getJobById, getMyJobs, updateJob, deleteJob, searchJobs } from '../../controllers/jobController';
import { authenticate, requireEmployer } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { validateCreateJob, validateUpdateJob, validateJobIdParam, validateSearchJobs } from '../../validators/jobValidators';

const router = Router();

// 1. Job search (public endpoint)
router.get('/search', validate(validateSearchJobs), searchJobs);

// 2. Employer job creation
router.post('/', authenticate, requireEmployer, validate(validateCreateJob), createJob);

// 3. Employer retrieval of own jobs
router.get('/my', authenticate, requireEmployer, getMyJobs);

// 4. Job detail lookup by ID (public)
router.get('/:id', validate(validateJobIdParam), getJobById);

// 5. Update job by ID (employer only)
router.put('/:id', authenticate, requireEmployer, validate(validateJobIdParam), validate(validateUpdateJob), updateJob);

// 6. Delete job by ID (employer only)
router.delete('/:id', authenticate, requireEmployer, validate(validateJobIdParam), deleteJob);

export default router;
