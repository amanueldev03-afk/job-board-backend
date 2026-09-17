const fs = require('fs');
const path = require('path');

// Get package.json version safely
let packageVersion = '1.0.0';
try {
    const packagePath = path.join(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    packageVersion = packageJson.version;
} catch (err) {
    packageVersion = '1.0.0';
}

const getApiVersion = (req) => {
    if (req && req.originalUrl && req.originalUrl.includes('/v2/')) return '2.0.0';
    if (req && req.originalUrl && req.originalUrl.includes('/v1/')) return '1.0.0';
    return '1.0.0';
};

const sendSuccess = (res, data = null, message = 'Success', statusCode = 200, req = null) => {
    const response = {
        success: true,
        message,
        data,
        timestamp: new Date().toISOString(),
        version: getApiVersion(req),
        apiVersion: packageVersion
    };
    
    return res.status(statusCode).json(response);
};

const sendError = (res, message = 'Internal Server Error', statusCode = 500, errorDetails = null, req = null) => {
    const response = {
        success: false,
        message,
        timestamp: new Date().toISOString(),
        version: getApiVersion(req),
        apiVersion: packageVersion
    };
    
    if (errorDetails && process.env.NODE_ENV !== 'production') {
        response.error = errorDetails;
    }
    
    return res.status(statusCode).json(response);
};

const sendCreated = (res, data, message = 'Resource created successfully', req = null) => {
    return sendSuccess(res, data, message, 201, req);
};

const sendBadRequest = (res, message = 'Bad request', errorDetails = null, req = null) => {
    return sendError(res, message, 400, errorDetails, req);
};

const sendUnauthorized = (res, message = 'Unauthorized access', req = null) => {
    return sendError(res, message, 401, null, req);
};

const sendForbidden = (res, message = 'Access forbidden', req = null) => {
    return sendError(res, message, 403, null, req);
};

const sendNotFound = (res, message = 'Resource not found', req = null) => {
    return sendError(res, message, 404, null, req);
};

module.exports = {
    sendSuccess,
    sendError,
    sendCreated,
    sendBadRequest,
    sendUnauthorized,
    sendForbidden,
    sendNotFound
};