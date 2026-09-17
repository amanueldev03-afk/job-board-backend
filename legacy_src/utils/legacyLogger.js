const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../../logs');

if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const getTimestamp = () => {
    return new Date().toISOString();
};

const writeToFile = (level, message) => {
    const logEntry = `[${getTimestamp()}] [${level.toUpperCase()}] ${message}\n`;
    const logFile = path.join(logDir, `${level}.log`);
    
    fs.appendFile(logFile, logEntry, (err) => {
        if (err) console.error('Log write failed:', err);
    });
};

const logger = {
    info: (message) => {
        console.log(`[${getTimestamp()}] INFO: ${message}`);
        writeToFile('info', message);
    },

    error: (message) => {
        console.error(`[${getTimestamp()}] ERROR: ${message}`);
        writeToFile('error', message);
    },

    warn: (message) => {
        console.warn(`[${getTimestamp()}] WARN: ${message}`);
        writeToFile('warn', message);
    },

    debug: (message) => {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[${getTimestamp()}] DEBUG: ${message}`);
            writeToFile('debug', message);
        }
    },

    http: (req, res, responseTime) => {
        const message = `${req.method} ${req.url} ${res.statusCode} - ${responseTime}ms`;
        logger.info(message);
    },

    db: (operation, collection, error = null) => {
        const message = error 
            ? `DB ${operation} failed on ${collection}: ${error.message}`
            : `DB ${operation} successful on ${collection}`;
        error ? logger.error(message) : logger.debug(message);
    }
};

module.exports = logger;