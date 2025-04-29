const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const appointmentSchema = new mongoose.Schema(
    {
        patientId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        doctorId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        diagnosisId: {
            type: Schema.Types.ObjectId,
            ref: 'Diagnosis',
        },
        date: {
            type: Date,
            required: true,
        },
        time: {
            start: {
                type: String,
                required: true,
            },
            end: {
                type: String,
            },
        },
        status: {
            type: String,
            enum: ['scheduled', 'completed', 'cancelled', 'no_show'],
            default: 'scheduled',
        },
        notes: {
            preAppointment: String,
            postAppointment: String,
        },
        requiredReports: [{
            type: Schema.Types.ObjectId,
            ref: 'Report',
        }],
        followupAppointmentId: {
            type: Schema.Types.ObjectId,
            ref: 'Appointment',
        },
        remindersSent: [
            {
                type: {
                    type: String,
                    enum: ['email', 'push', 'sms'],
                },
                sentAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        calendarEventId: {
            type: String, // For Google Calendar integration
        },
        cancelledBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        cancelReason: {
            type: String,
        },
        checkedIn: {
            type: Boolean,
            default: false,
        },
        checkedInAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Appointment', appointmentSchema);