const Notification = require('../models/notification.model');
const User = require('../models/user.model');
const { AppError } = require('../middleware/error.middleware');
const admin = require('firebase-admin');
const config = require('../config/config');

// Initialize Firebase Admin SDK for push notifications
try {
    // In a real application, you'd use Firebase credentials from environment variables
    // For now, we'll conditionally initialize only if credentials are provided
    if (config.FIREBASE_CREDENTIALS) {
        admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(config.FIREBASE_CREDENTIALS))
        });
    }
} catch (error) {
    console.error('Firebase initialization error:', error);
    // Continue without Firebase if initialization fails
}

// Create notification
exports.createNotification = async (userId, type, title, body, data = {}) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Create notification
        const notification = new Notification({
            userId,
            type,
            title,
            body,
            data,
            sentAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days expiration
        });

        await notification.save();

        // Send push notification if user has device tokens
        if (user.deviceTokens && user.deviceTokens.length > 0 && admin.messaging) {
            try {
                const message = {
                    notification: {
                        title,
                        body
                    },
                    data: {
                        type,
                        referenceType: data.referenceType || '',
                        referenceId: data.referenceId ? data.referenceId.toString() : ''
                    },
                    tokens: user.deviceTokens
                };

                const response = await admin.messaging().sendMulticast(message);

                // Update notification with delivery status
                notification.deliveryStatus.push = {
                    status: 'sent',
                    sentAt: new Date()
                };

                await notification.save();
            } catch (pushError) {
                console.error('Push notification error:', pushError);

                // Update notification with failed status
                notification.deliveryStatus.push = {
                    status: 'failed',
                    sentAt: new Date()
                };

                await notification.save();
            }
        }

        return notification;
    } catch (error) {
        console.error('Create notification error:', error);
        throw new AppError('Failed to create notification', 500);
    }
};

// Get notifications for a user
exports.getUserNotifications = async (userId, filters = {}) => {
    try {
        const query = { userId };

        // Apply read status filter if provided
        if (filters.read !== undefined) {
            query.read = filters.read;
        }

        // Apply type filter if provided
        if (filters.type) {
            query.type = filters.type;
        }

        // Apply date range filter if provided
        if (filters.startDate && filters.endDate) {
            query.sentAt = {
                $gte: new Date(filters.startDate),
                $lte: new Date(filters.endDate)
            };
        }

        const notifications = await Notification.find(query)
            .sort({ sentAt: -1 })
            .limit(filters.limit ? parseInt(filters.limit, 10) : 50);

        return notifications;
    } catch (error) {
        console.error('Get user notifications error:', error);
        throw new AppError('Failed to get notifications', 500);
    }
};

// Mark notification as read
exports.markNotificationRead = async (notificationId, userId) => {
    try {
        const notification = await Notification.findById(notificationId);
        if (!notification) {
            throw new AppError('Notification not found', 404);
        }

        // Check authorization
        if (notification.userId.toString() !== userId.toString()) {
            throw new AppError('Not authorized to update this notification', 403);
        }

        // Mark as read
        notification.read = true;
        notification.readAt = new Date();

        await notification.save();

        return notification;
    } catch (error) {
        console.error('Mark notification read error:', error);
        throw new AppError('Failed to mark notification as read', 500);
    }
};

// Delete notification
exports.deleteNotification = async (notificationId, userId) => {
    try {
        const notification = await Notification.findById(notificationId);
        if (!notification) {
            throw new AppError('Notification not found', 404);
        }

        // Check authorization
        if (notification.userId.toString() !== userId.toString()) {
            throw new AppError('Not authorized to delete this notification', 403);
        }

        await notification.remove();

        return { success: true };
    } catch (error) {
        console.error('Delete notification error:', error);
        throw new AppError('Failed to delete notification', 500);
    }
};

// Register device for push notifications
exports.registerDeviceToken = async (userId, token, deviceType) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Initialize deviceTokens array if it doesn't exist
        if (!user.deviceTokens) {
            user.deviceTokens = [];
        }

        // Add token if it doesn't already exist
        if (!user.deviceTokens.includes(token)) {
            user.deviceTokens.push(token);
            await user.save();
        }

        return { success: true };
    } catch (error) {
        console.error('Register device token error:', error);
        throw new AppError('Failed to register device token', 500);
    }
};

// Unregister device for push notifications
exports.unregisterDeviceToken = async (userId, token) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Remove token if it exists
        if (user.deviceTokens && user.deviceTokens.includes(token)) {
            user.deviceTokens = user.deviceTokens.filter(t => t !== token);
            await user.save();
        }

        return { success: true };
    } catch (error) {
        console.error('Unregister device token error:', error);
        throw new AppError('Failed to unregister device token', 500);
    }
};

// Specialized notification functions
exports.createAppointmentNotification = async (appointment) => {
    try {
        const title = 'New Appointment Scheduled';
        const body = `Your appointment with Dr. ${appointment.doctorId.name.last} has been scheduled for ${new Date(appointment.date).toLocaleDateString()} at ${appointment.time.start}.`;

        return await this.createNotification(
            appointment.patientId,
            'appointment',
            title,
            body,
            {
                referenceType: 'appointment',
                referenceId: appointment._id
            }
        );
    } catch (error) {
        console.error('Create appointment notification error:', error);
        // Don't throw error to prevent breaking the main flow
    }
};

exports.createAppointmentUpdateNotification = async (appointment) => {
    try {
        const title = 'Appointment Updated';
        const body = `Your appointment with Dr. ${appointment.doctorId.name.last} has been updated. Please check the details.`;

        return await this.createNotification(
            appointment.patientId,
            'appointment',
            title,
            body,
            {
                referenceType: 'appointment',
                referenceId: appointment._id
            }
        );
    } catch (error) {
        console.error('Create appointment update notification error:', error);
        // Don't throw error to prevent breaking the main flow
    }
};

exports.createAppointmentCancellationNotification = async (appointment, cancelType) => {
    try {
        let title, body, recipientId;

        if (cancelType === 'patient_cancelled') {
            // Notify doctor
            title = 'Appointment Cancelled by Patient';
            body = `The appointment with ${appointment.patientId.name.first} ${appointment.patientId.name.last} on ${new Date(appointment.date).toLocaleDateString()} has been cancelled.`;
            recipientId = appointment.doctorId;
        } else {
            // Notify patient
            title = 'Appointment Cancelled by Doctor';
            body = `Your appointment with Dr. ${appointment.doctorId.name.last} on ${new Date(appointment.date).toLocaleDateString()} has been cancelled.`;
            recipientId = appointment.patientId;
        }

        return await this.createNotification(
            recipientId,
            'appointment',
            title,
            body,
            {
                referenceType: 'appointment',
                referenceId: appointment._id
            }
        );
    } catch (error) {
        console.error('Create appointment cancellation notification error:', error);
        // Don't throw error to prevent breaking the main flow
    }
};

exports.createAppointmentCompletionNotification = async (appointment) => {
    try {
        const title = 'Appointment Completed';
        const body = `Your appointment with Dr. ${appointment.doctorId.name.last} on ${new Date(appointment.date).toLocaleDateString()} has been marked as completed.`;

        return await this.createNotification(
            appointment.patientId,
            'appointment',
            title,
            body,
            {
                referenceType: 'appointment',
                referenceId: appointment._id
            }
        );
    } catch (error) {
        console.error('Create appointment completion notification error:', error);
        // Don't throw error to prevent breaking the main flow
    }
};

exports.createFollowUpAppointmentNotification = async (appointment) => {
    try {
        const title = 'Follow-up Appointment Scheduled';
        const body = `A follow-up appointment with Dr. ${appointment.doctorId.name.last} has been scheduled for ${new Date(appointment.date).toLocaleDateString()} at ${appointment.time.start}.`;

        return await this.createNotification(
            appointment.patientId,
            'appointment',
            title,
            body,
            {
                referenceType: 'appointment',
                referenceId: appointment._id
            }
        );
    } catch (error) {
        console.error('Create follow-up appointment notification error:', error);
        // Don't throw error to prevent breaking the main flow
    }
};

exports.createReportUploadNotification = async (report, doctorId) => {
    try {
        const title = 'New Medical Report Uploaded';
        const body = `A new ${report.type} report has been uploaded by a patient.`;

        return await this.createNotification(
            doctorId,
            'report',
            title,
            body,
            {
                referenceType: 'report',
                referenceId: report._id
            }
        );
    } catch (error) {
        console.error('Create report upload notification error:', error);
        // Don't throw error to prevent breaking the main flow
    }
};

exports.createReportAnalysisNotification = async (report) => {
    try {
        const title = 'Report Analysis Ready';
        const body = `AI analysis for your ${report.type} report is now available.`;

        return await this.createNotification(
            report.patientId,
            'report',
            title,
            body,
            {
                referenceType: 'report',
                referenceId: report._id
            }
        );
    } catch (error) {
        console.error('Create report analysis notification error:', error);
        // Don't throw error to prevent breaking the main flow
    }
};

exports.createReportReviewedNotification = async (report) => {
    try {
        const title = 'Report Reviewed by Doctor';
        const body = `Your ${report.type} report has been reviewed by the doctor.`;

        return await this.createNotification(
            report.patientId,
            'report',
            title,
            body,
            {
                referenceType: 'report',
                referenceId: report._id
            }
        );
    } catch (error) {
        console.error('Create report reviewed notification error:', error);
        // Don't throw error to prevent breaking the main flow
    }
};

exports.createAllReportsReadyNotification = async (diagnosis) => {
    try {
        const title = 'All Reports Submitted';
        const body = `All required reports for diagnosis #${diagnosis._id.toString().substring(0, 6)} have been submitted by the patient.`;

        return await this.createNotification(
            diagnosis.finalDoctorId,
            'report',
            title,
            body,
            {
                referenceType: 'diagnosis',
                referenceId: diagnosis._id
            }
        );
    } catch (error) {
        console.error('Create all reports ready notification error:', error);
        // Don't throw error to prevent breaking the main flow
    }
};

exports.createPrescriptionParsedNotification = async (medication) => {
    try {
        const title = 'Prescription Processed';
        const body = `Your prescription has been processed. ${medication.medications.length} medications have been identified.`;

        return await this.createNotification(
            medication.patientId,
            'medication',
            title,
            body,
            {
                referenceType: 'medication',
                referenceId: medication._id
            }
        );
    } catch (error) {
        console.error('Create prescription parsed notification error:', error);
        // Don't throw error to prevent breaking the main flow
    }
};

exports.createMedicationReminderNotification = async (medication, med, medicationIndex, time) => {
    try {
        const title = 'Medication Reminder';
        const body = `Time to take ${med.name} ${med.dosage}. ${med.instructions}`;

        return await this.createNotification(
            medication.patientId,
            'medication',
            title,
            body,
            {
                referenceType: 'medication',
                referenceId: medication._id,
                additionalData: {
                    medicationIndex,
                    time
                }
            }
        );
    } catch (error) {
        console.error('Create medication reminder notification error:', error);
        // Don't throw error to prevent breaking the main flow
    }
};

exports.createHealthAlertNotification = async (healthMetric) => {
    try {
        let title, body, priority;

        // Determine title and priority based on severity
        if (healthMetric.abnormalityDetails && healthMetric.abnormalityDetails.severity) {
            switch (healthMetric.abnormalityDetails.severity) {
                case 'severe':
                    title = 'URGENT: Abnormal Health Reading';
                    priority = 'urgent';
                    break;
                case 'moderate':
                    title = 'Warning: Abnormal Health Reading';
                    priority = 'high';
                    break;
                default:
                    title = 'Notice: Abnormal Health Reading';
                    priority = 'normal';
            }
        } else {
            title = 'Abnormal Health Reading Detected';
            priority = 'normal';
        }

        // Format body message based on metric type
        let valueText;
        if (healthMetric.type === 'blood_pressure') {
            valueText = `${healthMetric.value.systolic}/${healthMetric.value.diastolic} ${healthMetric.unit}`;
        } else {
            valueText = `${healthMetric.value} ${healthMetric.unit}`;
        }

        body = `Your ${formatMetricTypeName(healthMetric.type)} reading of ${valueText} is outside the normal range.`;

        if (healthMetric.abnormalityDetails && healthMetric.abnormalityDetails.description) {
            body += ` ${healthMetric.abnormalityDetails.description}`;
        }

        return await this.createNotification(
            healthMetric.patientId,
            'health_alert',
            title,
            body,
            {
                referenceType: 'healthMetric',
                referenceId: healthMetric._id,
                priority
            }
        );
    } catch (error) {
        console.error('Create health alert notification error:', error);
        // Don't throw error to prevent breaking the main flow
    }
};

exports.createBadgeEarnedNotification = async (patient, badgeType) => {
    try {
        let title, body;

        switch (badgeType) {
            case 'week_streak':
                title = 'Badge Earned: 7-Day Streak!';
                body = 'Congratulations! You\'ve taken your medications on time for 7 consecutive days.';
                break;
            case 'month_streak':
                title = 'Badge Earned: 30-Day Streak!';
                body = 'Amazing achievement! You\'ve taken your medications on time for 30 consecutive days.';
                break;
            default:
                title = 'New Badge Earned!';
                body = 'Congratulations! You\'ve earned a new badge for your health achievements.';
        }

        return await this.createNotification(
            patient._id,
            'general',
            title,
            body,
            {
                referenceType: 'other',
                additionalData: {
                    badgeType
                }
            }
        );
    } catch (error) {
        console.error('Create badge earned notification error:', error);
        // Don't throw error to prevent breaking the main flow
    }
};

// Helper functions
function formatMetricTypeName(type) {
    switch (type) {
        case 'heart_rate':
            return 'heart rate';
        case 'blood_pressure':
            return 'blood pressure';
        case 'glucose':
            return 'blood glucose';
        case 'weight':
            return 'weight';
        case 'oxygen':
            return 'oxygen saturation';
        case 'temperature':
            return 'body temperature';
        default:
            return type;
    }
}