const express = require('express');
const router = express.Router();
const applicationController = require('../../controllers/applicationController');
const { protect, authorize } = require('../../middleware/authMiddleware');
const { validateApplication, validateIdParam, validateStatusUpdate } = require('../../middleware/validationMiddleware');
const { applicationLimiter } = require('../../middleware/rateLimiter');

router.get('/my-applications', protect, applicationController.getMyApplications);
router.get('/stats', protect, applicationController.getApplicationStats);
router.get('/:id', protect, validateIdParam, applicationController.getApplicationById);

router.post('/:jobId/apply', protect, applicationLimiter, validateApplication, applicationController.applyToJob);
router.patch('/:id/withdraw', protect, validateIdParam, applicationController.withdrawApplication);

router.get('/job/:jobId/applications', protect, authorize('company'), validateIdParam, applicationController.getJobApplications);
router.patch('/:id/status', protect, authorize('company'), validateIdParam, validateStatusUpdate, applicationController.updateApplicationStatus);
router.post('/:id/schedule-interview', protect, authorize('company'), validateIdParam, applicationController.scheduleInterview);
router.post('/:id/feedback', protect, authorize('company'), validateIdParam, applicationController.addInterviewFeedback);

module.exports = router;