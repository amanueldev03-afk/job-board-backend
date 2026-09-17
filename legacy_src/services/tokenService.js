const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const jwtConfig = require('../config/jwtConfig');
const RefreshToken = require('../models/RefreshToken');

const generateAccessToken = (userId) => {
    return jwt.sign({ id: userId }, jwtConfig.secret, {
        expiresIn: jwtConfig.expiresIn
    });
};

const generateRefreshToken = async (userId, deviceInfo = null, ipAddress = null) => {
    const token = crypto.randomBytes(40).toString('hex');
    
    const refreshToken = await RefreshToken.create({
        token,
        user: userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        deviceInfo,
        ipAddress
    });
    
    return refreshToken.token;
};

const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, jwtConfig.secret);
    } catch (error) {
        return null;
    }
};

const verifyRefreshToken = async (token) => {
    const refreshToken = await RefreshToken.findOne({
        token,
        revoked: false,
        expiresAt: { $gt: new Date() }
    }).populate('user');
    
    if (!refreshToken) {
        return null;
    }
    
    return refreshToken;
};

const revokeRefreshToken = async (token) => {
    await RefreshToken.updateOne({ token }, { revoked: true });
};

const revokeAllUserTokens = async (userId) => {
    await RefreshToken.updateMany({ user: userId }, { revoked: true });
};

const cleanupExpiredTokens = async () => {
    await RefreshToken.deleteMany({ expiresAt: { $lt: new Date() } });
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    revokeRefreshToken,
    revokeAllUserTokens,
    cleanupExpiredTokens
};