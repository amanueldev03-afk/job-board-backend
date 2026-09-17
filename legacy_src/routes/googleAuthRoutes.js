const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const authController = require('../controllers/authController');

// Initiate Google Login
router.get('/google',
    passport.authenticate('google', { 
        scope: ['profile', 'email'],
        prompt: 'select_account'
    })
);

// Google Callback (after user approves)
router.get('/google/callback',
    passport.authenticate('google', { 
        failureRedirect: '/api/auth/google/failed',
        session: false
    }),
    authController.googleLoginSuccess
);

// Failed login
router.get('/google/failed', authController.googleLoginFailed);

module.exports = router;