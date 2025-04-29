const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        type: {
            type: String,
            enum: ['appointment', 'report', 'medication', 'health_alert', 'general'],
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        body: {
            type: String,
            required: true,
        },
        data: {
            referenceType: {
                type: String,
                enum: ['appointment', 'diagnosis', 'report', 'medication', 'healthMetric', 'other'],
            },
            referenceId: {
                type: Schema.Types.ObjectId,
            },
            additionalData: Schema.Types.Mixed,
        },
        priority: {
            type: String,
            enum: ['low', 'normal', 'high', 'urgent'],
            default: 'normal',
        },
        read: {
            type: Boolean,
            default: false,
        },
        readAt: {
            type: Date,
        },
        sentAt: {
            type: Date,
            default: Date.now,
        },
        expiresAt: {
            type: Date,
        },
        deliveryStatus: {
            push: {
                status: {
                    type: String,
                    enum: ['pending', 'sent', 'failed', 'delivered'],
                    default: 'pending',
                },
                sentAt: Date,
            },
            email: {
                status: {
                    type: String,
                    enum: ['pending', 'sent', 'failed', 'delivered'],
                    default: 'pending',
                },
                sentAt: Date,
            },
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for efficient querying
notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ userId: 1, sentAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);