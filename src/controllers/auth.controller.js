const authService = require('../services/auth.service');
const { successResponse, errorResponse } = require('../utils/response.utils');

// Register a new patient
exports.registerPatient = async (req, res, next) => {
    try {
        const userData = req.body;
        const result = await authService.registerPatient(userData);
        return successResponse(res, result, 'Patient registered successfully', 201);
    } catch (error) {
        next(error);
    }
};

// Register a new doctor (admin only)
exports.registerDoctor = async (req, res, next) => {
    try {
        const doctorData = req.body;
        const result = await authService.registerDoctor(doctorData);
        return successResponse(res, result, 'Doctor registered successfully', 201);
    } catch (error) {
        next(error);
    }
};

// Login user
exports.loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        console.log(email, password);
        const result = await authService.loginUser(email, password);
        return successResponse(res, result, 'Login successful');
    } catch (error) {
        next(error);
    }
};

// Refresh token
exports.refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        const result = await authService.refreshToken(refreshToken);
        return successResponse(res, result, 'Token refreshed successfully');
    } catch (error) {
        next(error);
    }
};

// Logout user
exports.logoutUser = async (req, res, next) => {
    try {
        const userId = req.user._id;
        await authService.logoutUser(userId);
        return successResponse(res, null, 'Logout successful');
    } catch (error) {
        next(error);
    }
};

// Forgot password
exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const result = await authService.forgotPassword(email);
        return successResponse(res, result, 'Password reset email sent');
    } catch (error) {
        next(error);
    }
};

// Reset password
exports.resetPassword = async (req, res, next) => {
    try {
        const { resetToken, newPassword } = req.body;
        const result = await authService.resetPassword(resetToken, newPassword);
        return successResponse(res, result, 'Password reset successful');
    } catch (error) {
        next(error);
    }
};

// Get current user profile
exports.getProfile = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const result = await authService.getProfile(userId);
        return successResponse(res, result, 'Profile retrieved successfully');
    } catch (error) {
        next(error);
    }
};

// Update current user profile
exports.updateProfile = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const updateData = req.body;
        const result = await authService.updateProfile(userId, updateData);
        return successResponse(res, result, 'Profile updated successfully');
    } catch (error) {
        next(error);
    }
};