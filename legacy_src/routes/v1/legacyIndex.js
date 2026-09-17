const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const companyRoutes = require('./companyRoutes');
const jobRoutes = require('./jobRoutes');
const applicationRoutes = require('./applicationRoutes');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/companies', companyRoutes);
router.use('/jobs', jobRoutes);
router.use('/applications', applicationRoutes);

module.exports = router;