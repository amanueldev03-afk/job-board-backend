const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Application = sequelize.define('Application', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    jobId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'job_id'
    },
    candidateId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'candidate_id'
    },
    status: {
        type: DataTypes.ENUM('pending', 'reviewed', 'shortlisted', 'rejected', 'hired', 'withdrawn'),
        defaultValue: 'pending'
    },
    documents: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
            resume: '',
            coverLetter: '',
            portfolio: ''
        }
    },
    companyNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
            len: [0, 1000]
        },
        field: 'company_notes'
    },
    interviewDetails: {
        type: DataTypes.JSONB,
        defaultValue: {
            scheduled: false,
            date: null,
            type: null,
            meetingLink: '',
            notes: '',
            feedback: ''
        },
        field: 'interview_details'
    },
    timeline: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    rating: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 1,
            max: 5
        }
    },
    viewedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'viewed_at'
    },
    respondedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'responded_at'
    }
}, {
    timestamps: true,
    tableName: 'applications',
    hooks: {
        beforeSave: (application) => {
            if (application.changed('status')) {
                const timelineEntry = {
                    status: application.status,
                    timestamp: new Date(),
                    note: application.companyNotes
                };
                
                if (!application.timeline) {
                    application.timeline = [];
                }
                application.timeline.push(timelineEntry);
                
                if (application.status !== 'pending' && !application.respondedAt) {
                    application.respondedAt = new Date();
                }
                
                if (application.status === 'reviewed' && !application.viewedAt) {
                    application.viewedAt = new Date();
                }
            }
        }
    }
});

Application.prototype.updateStatus = async function(newStatus, note = '', userId = null) {
    this.status = newStatus;
    
    if (note) this.companyNotes = note;
    
    this.timeline.push({
        status: newStatus,
        timestamp: new Date(),
        note: note,
        updatedBy: userId
    });
    
    return await this.save();
};

Application.prototype.scheduleInterview = async function(interviewData) {
    this.interviewDetails = {
        scheduled: true,
        date: interviewData.date,
        type: interviewData.type,
        meetingLink: interviewData.meetingLink,
        notes: interviewData.notes
    };
    
    this.status = 'shortlisted';
    
    this.timeline.push({
        status: 'shortlisted',
        timestamp: new Date(),
        note: `Interview scheduled for ${new Date(interviewData.date).toLocaleString()}`
    });
    
    return await this.save();
};

Application.prototype.addInterviewFeedback = async function(feedback, rating = null) {
    this.interviewDetails.feedback = feedback;
    if (rating) this.rating = rating;
    return await this.save();
};

Application.prototype.canWithdraw = function() {
    return ['pending', 'reviewed', 'shortlisted'].includes(this.status);
};

Application.prototype.withdraw = async function(reason = '') {
    if (!this.canWithdraw()) {
        throw new Error('Cannot withdraw application at current status');
    }
    
    this.status = 'withdrawn';
    this.timeline.push({
        status: 'withdrawn',
        timestamp: new Date(),
        note: `Application withdrawn. Reason: ${reason || 'Not specified'}`
    });
    
    return await this.save();
};

Application.hasApplied = async function(jobId, candidateId) {
    const application = await this.findOne({ where: { jobId, candidateId } });
    return !!application;
};

Application.getCompanyApplications = async function(companyId, status = null) {
    const { Job } = require('./index');
    
    const jobs = await Job.findAll({ where: { companyId }, attributes: ['id'] });
    const jobIds = jobs.map(job => job.id);
    
    const where = { jobId: { [require('sequelize').Op.in]: jobIds } };
    if (status) where.status = status;
    
    return await this.findAll({ 
        where,
        order: [['createdAt', 'DESC']]
    });
};

Application.getJobStats = async function(jobId) {
    const applications = await this.findAll({ where: { jobId } });
    
    const result = {
        total: applications.length,
        pending: 0,
        reviewed: 0,
        shortlisted: 0,
        rejected: 0,
        hired: 0,
        withdrawn: 0
    };
    
    applications.forEach(app => {
        if (result[app.status] !== undefined) {
            result[app.status]++;
        }
    });
    
    return result;
};

Application.getByDateRange = async function(startDate, endDate, companyId = null) {
    const { Job } = require('./index');
    const { Op } = require('sequelize');
    
    const where = {
        createdAt: { [Op.between]: [startDate, endDate] }
    };
    
    if (companyId) {
        const jobs = await Job.findAll({ where: { companyId }, attributes: ['id'] });
        where.jobId = { [Op.in]: jobs.map(j => j.id) };
    }
    
    return await this.findAll({ where });
};

module.exports = Application;