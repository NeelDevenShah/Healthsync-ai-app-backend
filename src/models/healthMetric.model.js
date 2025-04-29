const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const healthMetricSchema = new mongoose.Schema(
    {
        patientId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        type: {
            type: String,
            enum: ['heart_rate', 'blood_pressure', 'glucose', 'temperature', 'oxygen', 'weight', 'other'],
            required: true,
        },
        value: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
        unit: {
            type: String,
            required: true,
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
        source: {
            type: String,
            enum: ['manual', 'iot', 'wearable'],
            default: 'manual',
        },
        deviceInfo: {
            deviceId: String,
            deviceType: String,
            manufacturer: String,
        },
        notes: {
            type: String,
        },
        isAbnormal: {
            type: Boolean,
            default: false,
        },
        abnormalityDetails: {
            severity: {
                type: String,
                enum: ['mild', 'moderate', 'severe'],
            },
            description: String,
        },
        notificationSent: {
            type: Boolean,
            default: false,
        },
        notificationSentAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for efficient querying
healthMetricSchema.index({ patientId: 1, type: 1, timestamp: -1 });

module.exports = mongoose.model('HealthMetric', healthMetricSchema);