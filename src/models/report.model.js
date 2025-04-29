const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reportSchema = new mongoose.Schema(
    {
        patientId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        diagnosisId: {
            type: Schema.Types.ObjectId,
            ref: 'Diagnosis',
        },
        appointmentId: {
            type: Schema.Types.ObjectId,
            ref: 'Appointment',
        },
        type: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        uploadedDate: {
            type: Date,
            default: Date.now,
        },
        fileUrl: {
            type: String,
            required: true,
        },
        originalFilename: {
            type: String,
        },
        mimeType: {
            type: String,
        },
        fileSize: {
            type: Number, // in bytes
        },
        thumbnail: {
            type: String,
        },
        aiSummary: {
            type: String,
        },
        aiSummaryStatus: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: 'pending',
        },
        doctorNotes: {
            type: String,
        },
        isReviewed: {
            type: Boolean,
            default: false,
        },
        reviewedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        reviewedAt: {
            type: Date,
        },
        abnormalFindings: [
            {
                finding: String,
                severity: {
                    type: String,
                    enum: ['low', 'medium', 'high'],
                },
                description: String,
            },
        ],
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Report', reportSchema);