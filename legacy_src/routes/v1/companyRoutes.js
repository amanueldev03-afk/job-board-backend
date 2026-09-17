const express = require('express');
const router = express.Router();
const companyController = require('../../controllers/companyController');
const uploadController = require('../../controllers/uploadController');
const { protect, authorize } = require('../../middleware/authMiddleware');
const { validateCompany, validateIdParam } = require('../../middleware/validationMiddleware');
const { uploadLogo, handleUploadError } = require('../../middleware/uploadMiddleware');

router.post('/', protect, authorize('company'), validateCompany, companyController.createCompany);
router.get('/profile', protect, authorize('company'), companyController.getCompanyProfile);
router.put('/profile', protect, authorize('company'), validateCompany, companyController.updateCompanyProfile);
router.delete('/profile', protect, authorize('company'), companyController.deleteCompanyProfile);
router.post('/logo', protect, authorize('company'), uploadLogo, handleUploadError, uploadController.uploadLogo);
router.get('/jobs', protect, authorize('company'), companyController.getCompanyJobs);
router.get('/applications', protect, authorize('company'), companyController.getCompanyApplications);

router.get('/', companyController.getAllCompanies);
router.get('/:id', validateIdParam, companyController.getCompanyById);
router.get('/:id/jobs', validateIdParam, companyController.getCompanyJobs);
router.post('/:id/rating', protect, validateIdParam, companyController.updateCompanyRating);

module.exports = router;