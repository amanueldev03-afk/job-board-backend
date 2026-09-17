const express = require('express');
const router = express.Router();

// Import versioned routes
const v1Routes = require('./v1');
const v2Routes = require('./v2');

// Version 1 routes (current stable)
router.use('/v1', v1Routes);

// Version 2 routes (beta/development)
router.use('/v2', v2Routes);

// Default to latest stable version (v1)
router.use('/', v1Routes);

module.exports = router;