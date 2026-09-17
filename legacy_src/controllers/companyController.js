const Company = require('../models/Company');
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const responseUtils = require('../utils/response');
const logger = require('../utils/logger');

const createCompany = async (req, res, next) => {
    try {
        const { companyName, description, website, location, industry, companySize, foundedYear, benefits } = req.body;

        const existingCompany = await Company.findOne({ companyName });
        if (existingCompany) {
            return responseUtils.sendBadRequest(res, 'Company name already exists');
        }

        const existingUserCompany = await Company.findOne({ user: req.user._id });
        if (existingUserCompany) {
            return responseUtils.sendBadRequest(res, 'You already have a company profile');
        }

        const company = await Company.create({
            user: req.user._id,
            companyName,
            description,
            website,
            location,
            industry,
            companySize,
            foundedYear,
            benefits
        });

        logger.info(`Company profile created: ${companyName} by user ${req.user.email}`);

        responseUtils.sendSuccess(res, { company }, 'Company profile created successfully', 201);

    } catch (error) {
        next(error);
    }
};

const getCompanyProfile = async (req, res, next) => {
    try {
        const company = await Company.findOne({ user: req.user._id });

        if (!company) {
            return responseUtils.sendNotFound(res, 'Company profile not found');
        }

        const jobCount = await Job.countDocuments({ company: company._id, isActive: true });
        
        const recentJobs = await Job.find({ company: company._id })
            .sort({ createdAt: -1 })
            .limit(5);

        responseUtils.sendSuccess(res, { 
            company, 
            stats: { jobCount },
            recentJobs 
        }, 'Company profile retrieved');

    } catch (error) {
        next(error);
    }
};

const getCompanyById = async (req, res, next) => {
    try {
        const company = await Company.findById(req.params.id).populate('user', 'name email avatar');

        if (!company) {
            return responseUtils.sendNotFound(res, 'Company not found');
        }

        const jobs = await Job.find({ company: company._id, isActive: true })
            .sort({ createdAt: -1 })
            .limit(10);

        const jobCount = await Job.countDocuments({ company: company._id, isActive: true });

        responseUtils.sendSuccess(res, { company, jobs, jobCount }, 'Company retrieved successfully');

    } catch (error) {
        next(error);
    }
};

const updateCompanyProfile = async (req, res, next) => {
    try {
        const { companyName, description, website, location, industry, companySize, foundedYear, benefits, branding } = req.body;

        const company = await Company.findOne({ user: req.user._id });

        if (!company) {
            return responseUtils.sendNotFound(res, 'Company profile not found');
        }

        if (companyName && companyName !== company.companyName) {
            const existing = await Company.findOne({ companyName });
            if (existing) {
                return responseUtils.sendBadRequest(res, 'Company name already exists');
            }
            company.companyName = companyName;
        }

        if (description) company.description = description;
        if (website) company.website = website;
        if (location) company.location = location;
        if (industry) company.industry = industry;
        if (companySize) company.companySize = companySize;
        if (foundedYear) company.foundedYear = foundedYear;
        if (benefits) company.benefits = benefits;
        
        if (branding) {
            if (branding.logo) company.branding.logo = branding.logo;
            if (branding.coverImage) company.branding.coverImage = branding.coverImage;
            if (branding.primaryColor) company.branding.primaryColor = branding.primaryColor;
        }

        await company.save();

        logger.info(`Company profile updated: ${company.companyName}`);

        responseUtils.sendSuccess(res, { company }, 'Company profile updated successfully');

    } catch (error) {
        next(error);
    }
};

const deleteCompanyProfile = async (req, res, next) => {
    try {
        const company = await Company.findOne({ user: req.user._id });

        if (!company) {
            return responseUtils.sendNotFound(res, 'Company profile not found');
        }

        await Job.deleteMany({ company: company._id });
        await company.deleteOne();

        logger.info(`Company profile deleted: ${company.companyName}`);

        responseUtils.sendSuccess(res, null, 'Company profile deleted successfully');

    } catch (error) {
        next(error);
    }
};

const getAllCompanies = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const query = { isActive: true };
        
        if (req.query.industry) {
            query.industry = req.query.industry;
        }
        
        if (req.query.search) {
            query.companyName = { $regex: req.query.search, $options: 'i' };
        }

        const companies = await Company.find(query)
            .populate('user', 'name email')
            .skip(skip)
            .limit(limit)
            .sort({ rating: -1, createdAt: -1 });

        const total = await Company.countDocuments(query);

        responseUtils.sendSuccess(res, {
            companies,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        }, 'Companies retrieved successfully');

    } catch (error) {
        next(error);
    }
};

const getCompanyJobs = async (req, res, next) => {
    try {
        const company = await Company.findOne({ user: req.user._id });

        if (!company) {
            return responseUtils.sendNotFound(res, 'Company profile not found');
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const query = { company: company._id };
        
        if (req.query.status) {
            query.status = req.query.status;
        }

        const jobs = await Job.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Job.countDocuments(query);

        responseUtils.sendSuccess(res, {
            jobs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        }, 'Company jobs retrieved');

    } catch (error) {
        next(error);
    }
};

const getCompanyApplications = async (req, res, next) => {
    try {
        const company = await Company.findOne({ user: req.user._id });

        if (!company) {
            return responseUtils.sendNotFound(res, 'Company profile not found');
        }

        const jobs = await Job.find({ company: company._id }).select('_id');
        const jobIds = jobs.map(job => job._id);

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const query = { job: { $in: jobIds } };
        
        if (req.query.status) {
            query.status = req.query.status;
        }

        const applications = await Application.find(query)
            .populate('candidate', 'name email avatar profile.skills')
            .populate('job', 'title location compensation')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await Application.countDocuments(query);

        const stats = await Application.getJobStats();

        responseUtils.sendSuccess(res, {
            applications,
            stats,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        }, 'Company applications retrieved');

    } catch (error) {
        next(error);
    }
};

const updateCompanyRating = async (req, res, next) => {
    try {
        const { rating } = req.body;

        if (rating < 1 || rating > 5) {
            return responseUtils.sendBadRequest(res, 'Rating must be between 1 and 5');
        }

        const company = await Company.findById(req.params.id);

        if (!company) {
            return responseUtils.sendNotFound(res, 'Company not found');
        }

        await company.updateRating(rating);

        logger.info(`Company rating updated: ${company.companyName} -> ${company.rating.average}`);

        responseUtils.sendSuccess(res, { 
            average: company.rating.average, 
            count: company.rating.count 
        }, 'Rating submitted successfully');

    } catch (error) {
        next(error);
    }
};

const uploadCompanyLogo = async (req, res, next) => {
    try {
        if (!req.file) {
            return responseUtils.sendBadRequest(res, 'No file uploaded');
        }

        const logoUrl = `/uploads/logos/${req.file.filename}`;

        const company = await Company.findOneAndUpdate(
            { user: req.user._id },
            { 'branding.logo': logoUrl },
            { new: true }
        );

        if (!company) {
            return responseUtils.sendNotFound(res, 'Company profile not found');
        }

        logger.info(`Company logo uploaded: ${company.companyName}`);

        responseUtils.sendSuccess(res, { logo: logoUrl }, 'Logo uploaded successfully');

    } catch (error) {
        next(error);
    }
};

module.exports = {
    createCompany,
    getCompanyProfile,
    getCompanyById,
    updateCompanyProfile,
    deleteCompanyProfile,
    getAllCompanies,
    getCompanyJobs,
    getCompanyApplications,
    updateCompanyRating,
    uploadCompanyLogo
};