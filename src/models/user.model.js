const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Base user schema (shared fields)
const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        password: {
            type: String,
            required: true,
            minlength: 6,
            select: false, // Don't return password by default
        },
        phone: {
            type: String,
            trim: true,
        },
        name: {
            first: {
                type: String,
                required: true,
                trim: true,
            },
            last: {
                type: String,
                required: true,
                trim: true,
            },
        },
        role: {
            type: String,
            enum: ['patient', 'doctor', 'admin'],
            required: true,
        },
        profilePicture: {
            type: String,
        },
        lastLogin: {
            type: Date,
        },
        refreshToken: {
            type: String,
            select: false, // Don't return refresh token by default
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        deviceTokens: [{
            // For push notifications
            type: String
        }],
    },
    {
        timestamps: true,
        discriminatorKey: 'role', // Field used to determine the discriminator model
    }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Get full name virtual
userSchema.virtual('fullName').get(function () {
    return `${this.name.first} ${this.name.last}`;
});

// Create base User model
const User = mongoose.model('User', userSchema);

module.exports = User;