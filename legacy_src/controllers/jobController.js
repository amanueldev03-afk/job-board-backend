const Job = require('../models/Job');
const Company = require('../models/Company');
const Application = require('../models/Application');
const responseUtils = require('../utils/response');
const logger = require('../utils/logger');

const createJob = async (req, res, next) => {
    try {
        const company = await Company.findOne({ user: req.user._id });

        if (!company) {
            return responseUtils.sendBadRequest(res, 'Company profile required. Please create company profile first.');
        }

        const {
            title,
            description,
            requirements,
            responsibilities,
            location,
            isRemote,
            compensation,
            employmentType,
            experienceLevel,
            skills,
            benefits,
            deadline,
            metadata
        } = req.body;

        const job = await Job.create({
            company: company._id,
            title,
            description,
            requirements,
            responsibilities,
            location,
            isRemote: isRemote || false,
            compensation,
            employmentType,
            experienceLevel,
            skills,
            benefits,
            deadline,
            metadata: {
                featured: metadata?.featured || false,
                urgent: metadata?.urgent || false
            }
        });

        logger.info(`Job created: ${title} by company ${company.companyName}`);

        responseUtils.sendSuccess(res, { job }, 'Job created successfully', 201);

    } catch (error) {
        next(error);
    }
};

const getAllJobs = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const filters = {
            search: req.query.search,
            location: req.query.location,
            employmentType: req.query.employmentType,
            experienceLevel: req.query.experienceLevel,
            minSalary: req.query.minSalary,
            isRemote: req.query.isRemote === 'true',
            skills: req.query.skills ? req.query.skills.split(',') : null
        };

        let query = Job.findActive();

        if (filters.search) {
            query = Job.searchWithFilters(filters);
        } else {
            if (filters.location) {
                query.find({ location: { $regex: filters.location, $options: 'i' } });
            }
            if (filters.employmentType) {
                query.find({ employmentType: filters.employmentType });
            }
            if (filters.experienceLevel) {
                query.find({ experienceLevel: filters.experienceLevel });
            }
            if (filters.minSalary) {
                query.find({ 'compensation.salaryMax': { $gte: filters.minSalary } });
            }
            if (filters.isRemote !== undefined) {
                query.find({ isRemote: filters.isRemote });
            }
            if (filters.skills && filters.skills.length) {
                query.find({ skills: { $in: filters.skills } });
            }
        }

        const jobs = await query
            .populate('company', 'companyName logo location branding.primaryColor')
            .skip(skip)
            .limit(limit)
            .sort({ 'metadata.featured': -1, createdAt: -1 });

        const total = await Job.countDocuments(query._conditions);

        const featuredJobs = await Job.findActive()
            .find({ 'metadata.featured': true })
            .populate('company', 'companyName logo')
            .limit(3);

        responseUtils.sendSuccess(res, {
            jobs,
            featuredJobs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            },
            filters
        }, 'Jobs retrieved successfully');

    } catch (error) {
        next(error);
    }
};

const getJobById = async (req, res, next) => {
    try {
        const job = await Job.findById(req.params.id)
            .populate('company', 'companyName description logo location website branding industry companySize foundedYear benefits')
            .populate('applications');

        if (!job) {
            return responseUtils.sendNotFound(res, 'Job not found');
        }

        await job.incrementViews();

        const relatedJobs = await Job.findActive()
            .find({
                skills: { $in: job.skills },
                _id: { $ne: job._id }
            })
            .populate('company', 'companyName logo')
            .limit(4);

        const hasApplied = req.user ? await Application.hasApplied(job._id, req.user._id) : false;

        responseUtils.sendSuccess(res, {
            job,
            relatedJobs,
            hasApplied
        }, 'Job retrieved successfully');

    } catch (error) {
        next(error);
    }
};

const updateJob = async (req, res, next) => {
    try {
        const job = await Job.findById(req.params.id);

        if (!job) {
            return responseUtils.sendNotFound(res, 'Job not found');
        }

        const {
            title,
            description,
            requirements,
            responsibilities,
            location,
            isRemote,
            compensation,
            employmentType,
            experienceLevel,
            skills,
            benefits,
            deadline,
            status,
            metadata
        } = req.body;

        if (title) job.title = title;
        if (description) job.description = description;
        if (requirements) job.requirements = requirements;
        if (responsibilities) job.responsibilities = responsibilities;
        if (location) job.location = location;
        if (isRemote !== undefined) job.isRemote = isRemote;
        if (compensation) job.compensation = compensation;
        if (employmentType) job.employmentType = employmentType;
        if (experienceLevel) job.experienceLevel = experienceLevel;
        if (skills) job.skills = skills;
        if (benefits) job.benefits = benefits;
        if (deadline) job.deadline = deadline;
        if (status) job.status = status;
        if (metadata) {
            if (metadata.featured !== undefined) job.metadata.featured = metadata.featured;
            if (metadata.urgent !== undefined) job.metadata.urgent = metadata.urgent;
        }

        await job.save();

        logger.info(`Job updated: ${job.title} (${job._id})`);

        responseUtils.sendSuccess(res, { job }, 'Job updated successfully');

    } catch (error) {
        next(error);
    }
};

const deleteJob = async (req, res, next) => {
    try {
        const job = await Job.findById(req.params.id);

        if (!job) {
            return responseUtils.sendNotFound(res, 'Job not found');
        }

        await Application.deleteMany({ job: job._id });
        await job.deleteOne();

        logger.info(`Job deleted: ${job.title} (${job._id})`);

        responseUtils.sendSuccess(res, null, 'Job deleted successfully');

    } catch (error) {
        next(error);
    }
};

const getJobsByCompany = async (req, res, next) => {
    try {
        const company = await Company.findById(req.params.companyId);

        if (!company) {
            return responseUtils.sendNotFound(res, 'Company not found');
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const jobs = await Job.find({ company: company._id, isActive: true })
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await Job.countDocuments({ company: company._id, isActive: true });

        responseUtils.sendSuccess(res, {
            company: {
                name: company.companyName,
                logo: company.logo,
                location: company.location
            },
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

const getJobStats = async (req, res, next) => {
    try {
        let companyId = null;
        
        if (req.user && req.user.role === 'company') {
            const company = await Company.findOne({ user: req.user._id });
            companyId = company ? company._id : null;
        }

        const stats = await Job.getStatistics(companyId);
        const topSkills = await Job.getTopSkills(10);
        
        const jobsByType = await Job.aggregate([
            { $match: companyId ? { company: companyId } : {} },
            { $group: { _id: '$employmentType', count: { $sum: 1 } } }
        ]);

        const jobsByExperience = await Job.aggregate([
            { $match: companyId ? { company: companyId } : {} },
            { $group: { _id: '$experienceLevel', count: { $sum: 1 } } }
        ]);

        responseUtils.sendSuccess(res, {
            overview: stats,
            topSkills,
            byEmploymentType: jobsByType,
            byExperienceLevel: jobsByExperience
        }, 'Job statistics retrieved');

    } catch (error) {
        next(error);
    }
};

const toggleJobStatus = async (req, res, next) => {
    try {
        const job = await Job.findById(req.params.id);

        if (!job) {
            return responseUtils.sendNotFound(res, 'Job not found');
        }

        job.status = job.status === 'published' ? 'closed' : 'published';
        
        if (job.status === 'closed') {
            job.closedAt = new Date();
        }

        await job.save();

        logger.info(`Job status toggled: ${job.title} -> ${job.status}`);

        responseUtils.sendSuccess(res, { 
            status: job.status,
            message: `Job ${job.status === 'published' ? 'published' : 'closed'} successfully`
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    createJob,
    getAllJobs,
    getJobById,
    updateJob,
    deleteJob,
    getJobsByCompany,
    getJobStats,
    toggleJobStatus
};