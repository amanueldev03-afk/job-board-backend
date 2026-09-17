const Application = require('../models/Application');
const Job = require('../models/Job');
const Company = require('../models/Company');
const User = require('../models/User');
const responseUtils = require('../utils/response');
const logger = require('../utils/logger');

const applyToJob = async (req, res, next) => {
    try {
        const { jobId } = req.params;
        const { coverLetter, portfolio } = req.body;
        const resume = req.body.resume || req.file?.path;

        const job = await Job.findById(jobId);
        
        if (!job) {
            return responseUtils.sendNotFound(res, 'Job not found');
        }

        if (!job.isAcceptingApplications()) {
            return responseUtils.sendBadRequest(res, 'This job is no longer accepting applications');
        }

        const alreadyApplied = await Application.hasApplied(jobId, req.user._id);
        
        if (alreadyApplied) {
            return responseUtils.sendBadRequest(res, 'You have already applied for this job');
        }

        if (!resume) {
            return responseUtils.sendBadRequest(res, 'Resume is required');
        }

        const application = await Application.create({
            job: jobId,
            candidate: req.user._id,
            documents: {
                resume,
                coverLetter,
                portfolio
            }
        });

        await job.incrementApplications();

        logger.info(`New application: User ${req.user.email} applied to job ${job.title}`);

        responseUtils.sendSuccess(res, { application }, 'Application submitted successfully', 201);

    } catch (error) {
        next(error);
    }
};

const getMyApplications = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const query = { candidate: req.user._id };

        const applications = await Application.find(query)
            .populate('job', 'title location employmentType compensation.salaryMin compensation.salaryMax company')
            .populate({
                path: 'job',
                populate: { path: 'company', select: 'companyName logo location' }
            })
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await Application.countDocuments(query);

        const stats = {
            total: total,
            pending: await Application.countDocuments({ ...query, status: 'pending' }),
            reviewed: await Application.countDocuments({ ...query, status: 'reviewed' }),
            shortlisted: await Application.countDocuments({ ...query, status: 'shortlisted' }),
            rejected: await Application.countDocuments({ ...query, status: 'rejected' }),
            hired: await Application.countDocuments({ ...query, status: 'hired' })
        };

        responseUtils.sendSuccess(res, {
            applications,
            stats,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        }, 'My applications retrieved');

    } catch (error) {
        next(error);
    }
};

const getApplicationById = async (req, res, next) => {
    try {
        const application = await Application.findById(req.params.id)
            .populate('job', 'title description location employmentType compensation deadline skills')
            .populate('job', { populate: { path: 'company', select: 'companyName logo location website' } })
            .populate('candidate', 'name email avatar profile.skills profile.bio profile.location');

        if (!application) {
            return responseUtils.sendNotFound(res, 'Application not found');
        }

        const isOwner = application.candidate._id.toString() === req.user._id.toString();
        const isCompany = req.user.role === 'company';

        if (!isOwner && !isCompany) {
            return responseUtils.sendForbidden(res, 'Not authorized to view this application');
        }

        responseUtils.sendSuccess(res, { application }, 'Application retrieved successfully');

    } catch (error) {
        next(error);
    }
};

const getJobApplications = async (req, res, next) => {
    try {
        const { jobId } = req.params;

        const job = await Job.findById(jobId).populate('company');
        
        if (!job) {
            return responseUtils.sendNotFound(res, 'Job not found');
        }

        const company = await Company.findOne({ user: req.user._id });
        
        if (!company || job.company._id.toString() !== company._id.toString()) {
            return responseUtils.sendForbidden(res, 'Not authorized to view applications for this job');
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const query = { job: jobId };
        
        if (req.query.status) {
            query.status = req.query.status;
        }

        const applications = await Application.find(query)
            .populate('candidate', 'name email avatar profile.skills profile.bio profile.location profile.resume')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await Application.countDocuments(query);
        const stats = await Application.getJobStats(jobId);

        responseUtils.sendSuccess(res, {
            applications,
            stats,
            job: {
                id: job._id,
                title: job.title,
                location: job.location,
                employmentType: job.employmentType
            },
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        }, 'Job applications retrieved');

    } catch (error) {
        next(error);
    }
};

const updateApplicationStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, note } = req.body;

        const application = await Application.findById(id)
            .populate('job', 'title company')
            .populate('candidate', 'name email');

        if (!application) {
            return responseUtils.sendNotFound(res, 'Application not found');
        }

        const company = await Company.findOne({ user: req.user._id });
        
        if (!company || application.job.company.toString() !== company._id.toString()) {
            return responseUtils.sendForbidden(res, 'Not authorized to update this application');
        }

        await application.updateStatus(status, note, req.user._id);

        logger.info(`Application status updated: ${application.job.title} -> ${status} by ${req.user.email}`);

        responseUtils.sendSuccess(res, { 
            application,
            status: application.status,
            timeline: application.timeline
        }, 'Application status updated successfully');

    } catch (error) {
        next(error);
    }
};

const scheduleInterview = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { date, type, meetingLink, notes } = req.body;

        const application = await Application.findById(id)
            .populate('job', 'title company')
            .populate('candidate', 'name email');

        if (!application) {
            return responseUtils.sendNotFound(res, 'Application not found');
        }

        const company = await Company.findOne({ user: req.user._id });
        
        if (!company || application.job.company.toString() !== company._id.toString()) {
            return responseUtils.sendForbidden(res, 'Not authorized to schedule interview');
        }

        await application.scheduleInterview({ date, type, meetingLink, notes });

        logger.info(`Interview scheduled: ${application.job.title} for ${application.candidate.email}`);

        responseUtils.sendSuccess(res, { 
            interviewDetails: application.interviewDetails,
            message: `Interview scheduled for ${new Date(date).toLocaleString()}`
        }, 'Interview scheduled successfully');

    } catch (error) {
        next(error);
    }
};

const addInterviewFeedback = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { feedback, rating } = req.body;

        const application = await Application.findById(id)
            .populate('job', 'title company');

        if (!application) {
            return responseUtils.sendNotFound(res, 'Application not found');
        }

        const company = await Company.findOne({ user: req.user._id });
        
        if (!company || application.job.company.toString() !== company._id.toString()) {
            return responseUtils.sendForbidden(res, 'Not authorized to add feedback');
        }

        await application.addInterviewFeedback(feedback, rating);

        logger.info(`Interview feedback added for application: ${application._id}`);

        responseUtils.sendSuccess(res, { 
            feedback: application.interviewDetails.feedback,
            rating: application.rating
        }, 'Interview feedback added successfully');

    } catch (error) {
        next(error);
    }
};

const withdrawApplication = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const application = await Application.findById(id);

        if (!application) {
            return responseUtils.sendNotFound(res, 'Application not found');
        }

        if (application.candidate.toString() !== req.user._id.toString()) {
            return responseUtils.sendForbidden(res, 'Not authorized to withdraw this application');
        }

        if (!application.canWithdraw()) {
            return responseUtils.sendBadRequest(res, 'Cannot withdraw application at current status');
        }

        await application.withdraw(reason);

        logger.info(`Application withdrawn: ${application._id} by ${req.user.email}`);

        responseUtils.sendSuccess(res, null, 'Application withdrawn successfully');

    } catch (error) {
        next(error);
    }
};

const getApplicationStats = async (req, res, next) => {
    try {
        let stats = {};

        if (req.user.role === 'candidate') {
            stats = {
                total: await Application.countDocuments({ candidate: req.user._id }),
                pending: await Application.countDocuments({ candidate: req.user._id, status: 'pending' }),
                reviewed: await Application.countDocuments({ candidate: req.user._id, status: 'reviewed' }),
                shortlisted: await Application.countDocuments({ candidate: req.user._id, status: 'shortlisted' }),
                rejected: await Application.countDocuments({ candidate: req.user._id, status: 'rejected' }),
                hired: await Application.countDocuments({ candidate: req.user._id, status: 'hired' })
            };
        }

        if (req.user.role === 'company') {
            const company = await Company.findOne({ user: req.user._id });
            
            if (company) {
                const jobs = await Job.find({ company: company._id }).select('_id');
                const jobIds = jobs.map(job => job._id);
                
                stats = {
                    total: await Application.countDocuments({ job: { $in: jobIds } }),
                    pending: await Application.countDocuments({ job: { $in: jobIds }, status: 'pending' }),
                    reviewed: await Application.countDocuments({ job: { $in: jobIds }, status: 'reviewed' }),
                    shortlisted: await Application.countDocuments({ job: { $in: jobIds }, status: 'shortlisted' }),
                    rejected: await Application.countDocuments({ job: { $in: jobIds }, status: 'rejected' }),
                    hired: await Application.countDocuments({ job: { $in: jobIds }, status: 'hired' })
                };
            }
        }

        responseUtils.sendSuccess(res, { stats }, 'Application statistics retrieved');

    } catch (error) {
        next(error);
    }
};

module.exports = {
    applyToJob,
    getMyApplications,
    getApplicationById,
    getJobApplications,
    updateApplicationStatus,
    scheduleInterview,
    addInterviewFeedback,
    withdrawApplication,
    getApplicationStats
};