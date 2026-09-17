const cron = require('node-cron');
const User = require('../models/User');
const Company = require('../models/Company');
const Job = require('../models/Job');
const Application = require('../models/Application');
const RefreshToken = require('../models/RefreshToken');
const logger = require('../utils/logger');

// Run every day at midnight
const scheduleDeletionJob = () => {
    cron.schedule('0 0 * * *', async () => {
        try {
            logger.info('Running scheduled account deletion job...');

            const usersToDelete = await User.find({
                deletionRequested: true,
                scheduledDeletionDate: { $lt: new Date() }
            });

            for (const user of usersToDelete) {
                logger.info(`Deleting account for user: ${user.email}`);
                
                // Delete associated company data
                if (user.role === 'company') {
                    const company = await Company.findOne({ user: user._id });
                    if (company) {
                        await Job.deleteMany({ company: company._id });
                        await company.deleteOne();
                    }
                }
                
                // Delete applications
                if (user.role === 'candidate') {
                    await Application.deleteMany({ candidate: user._id });
                }
                
                // Delete refresh tokens
                await RefreshToken.deleteMany({ user: user._id });
                
                // Delete user
                await user.deleteOne();
                
                logger.info(`Account deleted for: ${user.email}`);
            }
            
            logger.info(`Deleted ${usersToDelete.length} accounts`);
            
        } catch (error) {
            logger.error(`Deletion job failed: ${error.message}`);
        }
    });
    
    logger.info('Scheduled deletion job initialized');
};

module.exports = scheduleDeletionJob;