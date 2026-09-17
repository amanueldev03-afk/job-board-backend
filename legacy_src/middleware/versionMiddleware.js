const logger = require('../utils/logger');

const versionDeprecation = (req, res, next) => {
    const version = req.headers['accept-version'] || '1.0';
    
    // Warn about deprecated versions
    if (version === '1.0') {
        res.setHeader('X-API-Deprecated', 'true');
        res.setHeader('X-API-Sunset-Date', '2026-12-31');
        logger.info(`Deprecated API version used: ${version}`);
    }
    
    next();
};

const versionHeader = (req, res, next) => {
    res.setHeader('X-API-Version', '1.0');
    res.setHeader('X-API-Latest-Version', '2.0');
    next();
};

module.exports = {
    versionDeprecation,
    versionHeader
};