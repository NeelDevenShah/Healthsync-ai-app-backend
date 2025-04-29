const mongoose = require('mongoose');
const User = require('./user.model');

// Doctor schema (extends User)
const doctorSchema = new mongoose.Schema({
    specialization: {
        type: String,
        required: true,
    },
    licenseNumber: {
        type: String,
        required: true,
        unique: true,
    },
    education: [
        {
            degree: String,
            institution: String,
            year: Number,
        },
    ],
    experience: {
        type: Number, // years
    },
    availableSlots: [
        {
            day: {
                type: String,
                enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            },
            startTime: String,
            endTime: String,
        },
    ],
    department: {
        type: String,
    },
    biography: {
        type: String,
    },
    currentlyAvailable: {
        type: Boolean,
        default: true,
    },
    averageRating: {
        type: Number,
        default: 0,
    },
    reviewCount: {
        type: Number,
        default: 0,
    },
    averageAppointmentDuration: {
        type: Number, // minutes
        default: 30,
    },
});

// Create Doctor model as a discriminator of User
const Doctor = User.discriminator('doctor', doctorSchema);

module.exports = Doctor;