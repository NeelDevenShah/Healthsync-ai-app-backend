const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const medicationSchema = new mongoose.Schema(
    {
        patientId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        prescriptionImage: {
            type: String, // URL to stored image
        },
        prescribedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        prescribedDate: {
            type: Date,
        },
        medications: [
            {
                name: {
                    type: String,
                    required: true,
                },
                dosage: {
                    type: String,
                },
                frequency: {
                    type: String,
                },
                startDate: {
                    type: Date,
                    default: Date.now,
                },
                endDate: {
                    type: Date,
                },
                instructions: {
                    type: String,
                },
                schedule: [
                    {
                        time: {
                            type: String,
                            required: true,
                        },
                        taken: {
                            type: Boolean,
                            default: false,
                        },
                        takenAt: {
                            type: Date,
                        },
                        skipped: {
                            type: Boolean,
                            default: false,
                        },
                        skippedReason: {
                            type: String,
                        },
                    },
                ],
            },
        ],
        reminders: [
            {
                medicationIndex: {
                    type: Number,
                    required: true,
                },
                time: {
                    type: String,
                    required: true,
                },
                status: {
                    type: String,
                    enum: ['pending', 'sent', 'acknowledged'],
                    default: 'pending',
                },
                sentAt: {
                    type: Date,
                },
                acknowledgedAt: {
                    type: Date,
                },
            },
        ],
        calendarSyncId: {
            type: String,
        },
        adherenceRate: {
            type: Number, // Percentage of medication taken on time
            default: 100,
        },
        aiParsingStatus: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: 'pending',
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Medication', medicationSchema);