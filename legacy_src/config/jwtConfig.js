const env = require('./env');

const jwtConfig = {
    secret: env.JWT_SECRET,
    expiresIn: '15m',
    refreshExpiresIn: '7d',
    cookieOptions: {
        httpOnly: true,   
        secure: env.isProduction,  
        sameSite: 'strict',  
        maxAge: 7 * 24 * 60 * 60 * 1000  
    }
};

console.log('  JWT Configuration Loaded:');
console.log(`   Access Token Expiration: ${jwtConfig.expiresIn}`);
console.log(`   Refresh Token Expiration: ${jwtConfig.refreshExpiresIn}`);
console.log(`   Secure Cookie: ${jwtConfig.cookieOptions.secure}`);

module.exports = jwtConfig;