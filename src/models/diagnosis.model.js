const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const diagnosisSchema = new mongoose.Schema(
    {
        patientId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        title: {
            type: String,
        },
        symptomDescription: {
            type: String,
        },
        conversationHistory: [
            {
                role: {
                    type: String,
                    enum: ['ai', 'patient'],
                    required: true,
                },
                message: {
                    type: String,
                    required: true,
                },
                timestamp: {
                    type: Date,
                    default: Date.now,
                },
                attachments: [
                    {
                        type: {
                            type: String,
                            enum: ['image', 'file'],
                        },
                        url: String,
                        originalName: String,
                        mimeType: String,
                    },
                ],
            },
        ],
        aiSummary: {
            type: String,
        },
        suggestedTests: [
            {
                name: {
                    type: String,
                    required: true,
                },
                reason: {
                    type: String,
                },
                priority: {
                    type: String,
                    enum: ['high', 'medium', 'low'],
                    default: 'medium',
                },
                isApproved: {
                    type: Boolean,
                    default: false,
                },
                approvedBy: {
                    type: Schema.Types.ObjectId,
                    ref: 'User',
                },
                approvedAt: {
                    type: Date,
                },
            },
        ],
        suggestedDoctor: {
            doctorId: {
                type: Schema.Types.ObjectId,
                ref: 'User',
            },
            reason: {
                type: String,
            },
            isConfirmed: {
                type: Boolean,
                default: false,
            },
        },
        finalDoctorId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        status: {
            type: String,
            enum: ['ongoing', 'pending_doctor_review', 'pending_reports', 'completed'],
            default: 'ongoing',
        },
        associatedAppointmentId: {
            type: Schema.Types.ObjectId,
            ref: 'Appointment',
        },
        diagnosisScore: {
            type: Number, // AI confidence score (0-100)
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Diagnosis', diagnosisSchema);