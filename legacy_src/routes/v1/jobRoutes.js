const express = require('express');
const router = express.Router();
const jobController = require('../../controllers/jobController');
const { protect, authorize } = require('../../middleware/authMiddleware');
const { validateJob, validateIdParam, validateJobFilters } = require('../../middleware/validationMiddleware');
const { jobPostLimiter, generalLimiter } = require('../../middleware/rateLimiter');

router.get('/', validateJobFilters, generalLimiter, jobController.getAllJobs);
router.get('/stats', jobController.getJobStats);
router.get('/:id', validateIdParam, protect, jobController.getJobById);

router.post('/', protect, authorize('company'), jobPostLimiter, validateJob, jobController.createJob);
router.put('/:id', protect, authorize('company'), validateIdParam, validateJob, jobController.updateJob);
router.delete('/:id', protect, authorize('company'), validateIdParam, jobController.deleteJob);
router.patch('/:id/toggle-status', protect, authorize('company'), validateIdParam, jobController.toggleJobStatus);

router.get('/company/:companyId/jobs', validateIdParam, jobController.getJobsByCompany);

module.exports = router;