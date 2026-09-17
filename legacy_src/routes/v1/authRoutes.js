const express = require('express');
const router = express.Router();
const authController = require('../../controllers/authController');
const { protect } = require('../../middleware/authMiddleware');
const { validateRegister, validateLogin } = require('../../middleware/validationMiddleware');
const { 
    loginLimiter, 
    registerLimiter, 
    forgotPasswordLimiter,
    resendVerificationLimiter 
} = require('../../middleware/rateLimiter');

router.post('/register', registerLimiter, validateRegister, authController.register);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/resend-verification', resendVerificationLimiter, authController.resendVerificationEmail);
router.post('/login', loginLimiter, validateLogin, authController.login);
router.post('/refresh-token', authController.refreshAccessToken);
router.post('/logout', protect, authController.logout);
router.post('/logout-all', protect, authController.logoutAllDevices);
router.get('/me', protect, authController.getMe);
router.put('/profile', protect, authController.updateProfile);
router.put('/change-password', protect, authController.changePassword);
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;