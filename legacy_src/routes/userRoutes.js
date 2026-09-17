const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const uploadController = require('../controllers/uploadController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateProfileUpdate, validateIdParam } = require('../middleware/validationMiddleware');
const { uploadAvatar, uploadResume, handleUploadError } = require('../middleware/uploadMiddleware');

// Profile routes
router.get('/me', protect, userController.getCurrentUser);
router.put('/me', protect, validateProfileUpdate, userController.updateCurrentUser);
router.delete('/me', protect, userController.deleteCurrentUser);

// File upload routes
router.post('/me/avatar', protect, uploadAvatar, handleUploadError, uploadController.uploadAvatar);
router.post('/me/resume', protect, uploadResume, handleUploadError, uploadController.uploadResume);
router.delete('/me/avatar', protect, uploadController.deleteAvatar);

// Account deletion routes
router.post('/me/request-deletion', protect, userController.requestAccountDeletion);
router.get('/confirm-deletion/:token', userController.confirmAccountDeletion);
router.post('/me/cancel-deletion', protect, userController.cancelDeletionRequest);
router.get('/me/deletion-status', protect, userController.getDeletionStatus);

// Admin routes
router.get('/', protect, authorize('admin'), userController.getAllUsers);
router.get('/stats', protect, authorize('admin'), userController.getUserStats);
router.get('/:id', protect, authorize('admin'), validateIdParam, userController.getUserById);
router.put('/:id/role', protect, authorize('admin'), validateIdParam, userController.updateUserRole);
router.patch('/:id/toggle-status', protect, authorize('admin'), validateIdParam, userController.toggleUserStatus);

module.exports = router;