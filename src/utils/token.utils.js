const jwt = require('jsonwebtoken');
const config = require('../config/config');

// Generate JWT token
exports.generateToken = (id) => {
    return jwt.sign({ id }, config.JWT_SECRET, {
        expiresIn: config.JWT_EXPIRATION
    });
};

// Generate refresh token
exports.generateRefreshToken = (id) => {
    return jwt.sign({ id }, config.JWT_SECRET, {
        expiresIn: config.REFRESH_TOKEN_EXPIRATION
    });
};

// Verify refresh token
exports.verifyRefreshToken = (token) => {
    return jwt.verify(token, config.JWT_SECRET);
};