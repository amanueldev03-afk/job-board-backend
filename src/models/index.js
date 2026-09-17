const User = require('./User');
const Company = require('./Company');
const Job = require('./Job');
const Application = require('./Application');
const RefreshToken = require('./RefreshToken');
const { sequelize } = require('../config/db');

const initializeRelations = () => {
    User.hasOne(Company, { foreignKey: 'userId', as: 'company' });
    Company.belongsTo(User, { foreignKey: 'userId', as: 'user' });

    Company.hasMany(Job, { foreignKey: 'companyId', as: 'jobs' });
    Job.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

    Job.hasMany(Application, { foreignKey: 'jobId', as: 'applications' });
    Application.belongsTo(Job, { foreignKey: 'jobId', as: 'job' });

    User.hasMany(Application, { foreignKey: 'candidateId', as: 'applications' });
    Application.belongsTo(User, { foreignKey: 'candidateId', as: 'candidate' });

    User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });
    RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

    console.log('✅ Model relationships initialized');
};

const getModel = (modelName) => {
    const models = {
        User,
        Company,
        Job,
        Application,
        RefreshToken
    };
    return models[modelName];
};

module.exports = {
    User,
    Company,
    Job,
    Application,
    RefreshToken,
    sequelize,
    getModel,
    initializeRelations
};