const dotenv = require('dotenv');
dotenv.config();

const config = {
    PORT: process.env.PORT || 5000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/job-board',
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    
    // Email Configuration
    EMAIL_HOST: process.env.EMAIL_HOST,
    EMAIL_PORT: process.env.EMAIL_PORT,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS: process.env.EMAIL_PASS,
    EMAIL_SECURE: process.env.EMAIL_SECURE,
    EMAIL_FROM: process.env.EMAIL_FROM,
    
    // Google OAuth
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
    
    // Cloudinary
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    
    // Upload Limits
    MAX_FILE_SIZE_IMAGE: process.env.MAX_FILE_SIZE_IMAGE || 2097152,
    MAX_FILE_SIZE_DOCUMENT: process.env.MAX_FILE_SIZE_DOCUMENT || 5242880
};

const requiredEnvVars = ['JWT_SECRET'];
for (const envVar of requiredEnvVars) {
    if (!config[envVar]) {
        throw new Error(`Required environment variable ${envVar} is not set`);
    }
}

console.log('   Environment Configuration Loaded:');
console.log(`   Mode: ${config.NODE_ENV}`);
console.log(`   Port: ${config.PORT}`);
console.log(`   Database: ${config.DATABASE_URL.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
console.log(`   Client URL: ${config.CLIENT_URL}`);
 console.log(`   Cloudinary: ${config.CLOUDINARY_CLOUD_NAME ? 'Configured ✅' : 'Not configured ❌'}`);

module.exports = config;