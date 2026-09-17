const express = require('express');
const router = express.Router();

// Version 2 routes (future enhancements)
// Current v2 = v1 (no changes yet)
const v1Routes = require('../v1');

// Use v1 routes as base for v2
router.use('/', v1Routes);

// Future v2 specific routes will override here
// Example:
// router.get('/jobs/advanced-search', v2JobController.advancedSearch);

module.exports = router;