const mongoose = require('mongoose');
const User = require('./user.model');

// Patient schema (extends User)
const patientSchema = new mongoose.Schema({
    dateOfBirth: {
        type: Date,
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    },
    address: {
        street: String,
        city: String,
        state: String,
        zip: String,
        country: String,
    },
    emergencyContact: {
        name: String,
        relationship: String,
        phone: String,
    },
    medicalHistory: [
        {
            condition: String,
            diagnosedDate: Date,
            notes: String,
        },
    ],
    allergies: [String],
    healthMetrics: {
        height: Number, // in cm
        weight: Number, // in kg
        bloodType: String,
    },
    gamification: {
        points: {
            type: Number,
            default: 0,
        },
        badges: [String],
        streaks: {
            medication: {
                type: Number,
                default: 0,
            },
            checkups: {
                type: Number,
                default: 0,
            },
        },
        level: {
            type: Number,
            default: 1,
        },
    },
    calendarConnected: {
        type: Boolean,
        default: false,
    },
    googleCalendarRefreshToken: {
        type: String,
        select: false,
    },
});

// Create Patient model as a discriminator of User
const Patient = User.discriminator('patient', patientSchema);

module.exports = Patient;