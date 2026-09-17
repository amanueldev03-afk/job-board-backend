const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/db');

const Job = sequelize.define('Job', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    companyId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'company_id'
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [1, 100]
        }
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            len: [50, 50000]
        }
    },
    requirements: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
        defaultValue: []
    },
    responsibilities: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: []
    },
    location: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isRemote: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_remote'
    },
    compensation: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
            salaryMin: 0,
            salaryMax: 0,
            currency: 'USD',
            salaryPeriod: 'yearly',
            isNegotiable: false
        }
    },
    employmentType: {
        type: DataTypes.ENUM('full-time', 'part-time', 'contract', 'internship', 'freelance', 'remote'),
        allowNull: false,
        field: 'employment_type'
    },
    experienceLevel: {
        type: DataTypes.ENUM('entry', 'junior', 'mid', 'senior', 'lead', 'executive'),
        allowNull: false,
        field: 'experience_level'
    },
    skills: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
        defaultValue: []
    },
    benefits: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: []
    },
    deadline: {
        type: DataTypes.DATE,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('draft', 'published', 'closed', 'expired'),
        defaultValue: 'published'
    },
    metadata: {
        type: DataTypes.JSONB,
        defaultValue: {
            views: 0,
            applications: 0,
            shares: 0,
            featured: false,
            urgent: false
        }
    },
    publishedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'published_at'
    },
    closedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'closed_at'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    }
}, {
    timestamps: true,
    tableName: 'jobs',
    hooks: {
        beforeSave: (job) => {
            if (job.deadline < new Date()) {
                job.status = 'expired';
            }
            if (job.changed('status') && job.status === 'published' && !job.publishedAt) {
                job.publishedAt = new Date();
            }
            if (job.changed('status') && job.status === 'closed') {
                job.closedAt = new Date();
            }
        }
    }
});

Job.prototype.isExpired = function() {
    return this.deadline < new Date();
};

Job.prototype.isAcceptingApplications = function() {
    return this.status === 'published' && !this.isExpired();
};

Job.prototype.incrementViews = async function() {
    this.metadata.views += 1;
    return await this.save();
};

Job.prototype.incrementApplications = async function() {
    this.metadata.applications += 1;
    return await this.save();
};

Job.prototype.close = async function() {
    this.status = 'closed';
    this.closedAt = new Date();
    return await this.save();
};

Job.findActive = function() {
    return this.findAll({
        where: {
            status: 'published',
            deadline: { [Op.gt]: new Date() }
        }
    });
};

Job.searchWithFilters = function(filters) {
    const where = {
        status: 'published',
        deadline: { [Op.gt]: new Date() }
    };

    if (filters.location) {
        where.location = { [Op.iLike]: `%${filters.location}%` };
    }
    if (filters.employmentType) {
        where.employmentType = filters.employmentType;
    }
    if (filters.experienceLevel) {
        where.experienceLevel = filters.experienceLevel;
    }
    if (filters.skills && filters.skills.length) {
        where.skills = { [Op.overlap]: filters.skills };
    }
    if (filters.minSalary) {
        where['compensation.salaryMax'] = { [Op.gte]: filters.minSalary };
    }
    if (filters.isRemote !== undefined) {
        where.isRemote = filters.isRemote;
    }

    return this.findAll({ where });
};

Job.getStatistics = async function(companyId = null) {
    const where = companyId ? { companyId } : {};
    
    const jobs = await this.findAll({ where });
    
    const stats = {
        totalJobs: jobs.length,
        activeJobs: jobs.filter(j => j.status === 'published' && j.deadline > new Date()).length,
        closedJobs: jobs.filter(j => j.status === 'closed').length,
        totalViews: jobs.reduce((sum, j) => sum + (j.metadata?.views || 0), 0),
        totalApplications: jobs.reduce((sum, j) => sum + (j.metadata?.applications || 0), 0),
        avgSalaryMin: jobs.length ? jobs.reduce((sum, j) => sum + (j.compensation?.salaryMin || 0), 0) / jobs.length : 0,
        avgSalaryMax: jobs.length ? jobs.reduce((sum, j) => sum + (j.compensation?.salaryMax || 0), 0) / jobs.length : 0
    };
    
    return stats;
};

Job.getTopSkills = async function(limit = 10) {
    const jobs = await this.findAll({
        where: { status: 'published' },
        attributes: ['skills']
    });
    
    const skillCounts = {};
    jobs.forEach(job => {
        (job.skills || []).forEach(skill => {
            skillCounts[skill] = (skillCounts[skill] || 0) + 1;
        });
    });
    
    return Object.entries(skillCounts)
        .map(([skill, count]) => ({ skill, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
};

module.exports = Job;