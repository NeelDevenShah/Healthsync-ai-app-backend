const { google } = require('googleapis');
const User = require('../models/user.model');
const config = require('../config/config');
const { AppError } = require('../middleware/error.middleware');

// OAuth2 client setup
const oauth2Client = new google.auth.OAuth2(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    config.GOOGLE_REDIRECT_URI
);

// Get Google Calendar API
const calendar = google.calendar({
    version: 'v3',
    auth: oauth2Client
});

// Generate auth URL for connecting calendar
exports.getAuthUrl = () => {
    const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
    ];

    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent'
    });
};

// Complete OAuth flow with code
exports.connectCalendar = async (userId, code) => {
    try {
        // Get tokens from code
        const { tokens } = await oauth2Client.getToken(code);

        // Update user with refresh token
        await User.findByIdAndUpdate(userId, {
            googleCalendarRefreshToken: tokens.refresh_token,
            calendarConnected: true
        });

        return { success: true };
    } catch (error) {
        console.error('Connect calendar error:', error);
        throw new AppError('Failed to connect Google Calendar', 500);
    }
};

// Get auth client for user
async function getAuthClientForUser(userId) {
    const user = await User.findById(userId).select('+googleCalendarRefreshToken');

    if (!user || !user.googleCalendarRefreshToken) {
        throw new AppError('User has not connected Google Calendar', 400);
    }

    // Set credentials
    oauth2Client.setCredentials({
        refresh_token: user.googleCalendarRefreshToken
    });

    return oauth2Client;
}

// Sync appointment to calendar
exports.syncAppointmentToCalendar = async (userId, appointmentId) => {
    try {
        // This is a simulated implementation
        console.log(`Syncing appointment ${appointmentId} to calendar for user ${userId}`);
        return `cal_${Date.now()}`;
    } catch (error) {
        console.error('Sync appointment to calendar error:', error);
        throw new AppError('Failed to sync appointment to calendar', 500);
    }
};

// Update calendar event
exports.updateCalendarEvent = async (userId, eventId, appointment) => {
    try {
        // This is a simulated implementation
        console.log(`Updating calendar event ${eventId} for user ${userId}`);
        return true;
    } catch (error) {
        console.error('Update calendar event error:', error);
        throw new AppError('Failed to update calendar event', 500);
    }
};

// Remove calendar event
exports.removeCalendarEvent = async (userId, eventId) => {
    try {
        // This is a simulated implementation
        console.log(`Removing calendar event ${eventId} for user ${userId}`);
        return true;
    } catch (error) {
        console.error('Remove calendar event error:', error);
        throw new AppError('Failed to remove calendar event', 500);
    }
};

// Sync medication to calendar
exports.syncMedicationToCalendar = async (userId, medicationId) => {
    try {
        // This is a simulated implementation
        console.log(`Syncing medication ${medicationId} to calendar for user ${userId}`);
        return `cal_med_${Date.now()}`;
    } catch (error) {
        console.error('Sync medication to calendar error:', error);
        throw new AppError('Failed to sync medication to calendar', 500);
    }
};

// Update medication calendar events
exports.updateMedicationCalendar = async (userId, calendarSyncId, medication) => {
    try {
        // This is a simulated implementation
        console.log(`Updating medication calendar events ${calendarSyncId} for user ${userId}`);
        return true;
    } catch (error) {
        console.error('Update medication calendar error:', error);
        throw new AppError('Failed to update medication calendar events', 500);
    }
};