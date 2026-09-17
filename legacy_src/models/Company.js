const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Company = sequelize.define('Company', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        field: 'user_id'
    },
    companyName: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            len: [1, 100]
        },
        field: 'company_name'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            len: [1, 2000]
        }
    },
    website: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isUrl: true
        }
    },
    location: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
            address: '',
            city: '',
            state: '',
            country: 'USA',
            zipCode: ''
        }
    },
    logo: {
        type: DataTypes.STRING,
        defaultValue: 'default-company-logo.png'
    },
    industry: {
        type: DataTypes.ENUM('Technology', 'Healthcare', 'Finance', 'Education', 'Retail', 'Manufacturing', 'Construction', 'Hospitality', 'Other'),
        allowNull: false
    },
    companySize: {
        type: DataTypes.ENUM('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'),
        allowNull: true,
        field: 'company_size'
    },
    foundedYear: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 1800,
            max: new Date().getFullYear()
        },
        field: 'founded_year'
    },
    benefits: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: []
    },
    isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_verified'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    },
    rating: {
        type: DataTypes.JSONB,
        defaultValue: {
            average: 0,
            count: 0
        }
    }
}, {
    timestamps: true,
    tableName: 'companies',
    hooks: {
        beforeSave: (company) => {
            if (company.changed('companyName')) {
                company.companyName = company.companyName.split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ');
            }
        }
    }
});

Company.prototype.getJobCount = async function() {
    const { Job } = require('./index');
    return await Job.count({ where: { companyId: this.id, isActive: true } });
};

Company.prototype.updateRating = async function(newRating) {
    const total = (this.rating.average * this.rating.count) + newRating;
    this.rating.count += 1;
    this.rating.average = total / this.rating.count;
    return await this.save();
};

Company.findByIndustry = function(industry) {
    return this.findAll({ where: { industry, isActive: true } });
};

module.exports = Company;