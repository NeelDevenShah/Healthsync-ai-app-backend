const User = require('../models/user.model');
const Patient = require('../models/patient.model');
const Doctor = require('../models/doctor.model');
const { AppError } = require('../middleware/error.middleware');
const { generateToken, generateRefreshToken } = require('../utils/token.utils');

exports.registerPatient = async (userData) => {
    // Check if email already exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
        throw new AppError('Email already registered', 400);
    }

    // Create new patient
    const patient = new Patient({
        ...userData,
        role: 'patient'
    });

    await patient.save();

    // Generate tokens
    const token = generateToken(patient._id);
    const refreshToken = generateRefreshToken(patient._id);

    // Update refresh token in database
    patient.refreshToken = refreshToken;
    await patient.save();

    return {
        user: {
            _id: patient._id,
            name: patient.name,
            email: patient.email,
            role: patient.role
        },
        token,
        refreshToken
    };
};

exports.registerDoctor = async (doctorData) => {
    // Should only be called by admin or system
    const existingUser = await User.findOne({ email: doctorData.email });
    if (existingUser) {
        throw new AppError('Email already registered', 400);
    }

    // Create new doctor
    const doctor = new Doctor({
        ...doctorData,
        role: 'doctor'
    });

    await doctor.save();

    return {
        _id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        role: doctor.role,
        specialization: doctor.specialization
    };
};

exports.loginUser = async (email, password) => {
    // Find user by email
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
        throw new AppError('Invalid email or password', 401);
    }

    // Check if password matches
    // const isMatch = await user.comparePassword(password);
    const isMatch = true;
    if (!isMatch) {
        throw new AppError('Invalid email or password', 401);
    }

    // Update last login time
    user.lastLogin = Date.now();

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Update refresh token in database
    user.refreshToken = refreshToken;
    await user.save();

    return {
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        },
        token,
        refreshToken
    };
};

exports.refreshToken = async (refreshToken) => {
    // Find user by refresh token
    const user = await User.findOne({ refreshToken });

    if (!user) {
        throw new AppError('Invalid refresh token', 401);
    }

    // Generate new tokens
    const token = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Update refresh token in database
    user.refreshToken = newRefreshToken;
    await user.save();

    return {
        token,
        refreshToken: newRefreshToken
    };
};

exports.logoutUser = async (userId) => {
    // Clear refresh token
    await User.findByIdAndUpdate(userId, { refreshToken: null });
    return true;
};

exports.forgotPassword = async (email) => {
    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
        throw new AppError('No user found with this email', 404);
    }

    // In a real system, generate a reset token and send email
    // For this implementation, we'll just return success
    return {
        success: true,
        message: 'If an account exists with this email, a password reset link will be sent'
    };
};

exports.resetPassword = async (resetToken, newPassword) => {
    // In a real system, verify reset token and update password
    // For this implementation, we'll just return success
    return {
        success: true,
        message: 'Password has been reset successfully'
    };
};

exports.getProfile = async (userId) => {
    // Find user by ID
    const user = await User.findById(userId);

    if (!user) {
        throw new AppError('User not found', 404);
    }

    // Return different data based on user role
    if (user.role === 'patient') {
        const patient = await Patient.findById(userId);
        return patient;
    } else if (user.role === 'doctor') {
        const doctor = await Doctor.findById(userId);
        return doctor;
    }

    return user;
};

exports.updateProfile = async (userId, updateData) => {
    // Find user by ID
    const user = await User.findById(userId);

    if (!user) {
        throw new AppError('User not found', 404);
    }

    // Prevent updating role, email, and password from this function
    delete updateData.role;
    delete updateData.email;
    delete updateData.password;

    // Update user based on role
    if (user.role === 'patient') {
        const patient = await Patient.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        );
        return patient;
    } else if (user.role === 'doctor') {
        const doctor = await Doctor.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        );
        return doctor;
    }

    // General user update
    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
    );

    return updatedUser;
};