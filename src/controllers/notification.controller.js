const notificationService = require('../services/notification.service');
const { successResponse, errorResponse } = require('../utils/response.utils');

// Get user notifications
exports.getNotifications = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const filters = {
            read: req.query.read === 'true',
            type: req.query.type,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            limit: parseInt(req.query.limit || '50', 10)
        };

        const result = await notificationService.getUserNotifications(userId, filters);
        return successResponse(res, result, 'Notifications retrieved successfully');
    } catch (error) {
        next(error);
    }
};

// Mark notification as read
exports.markNotificationRead = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const result = await notificationService.markNotificationRead(id, userId);
        return successResponse(res, result, 'Notification marked as read');
    } catch (error) {
        next(error);
    }
};

// Delete notification
exports.deleteNotification = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const result = await notificationService.deleteNotification(id, userId);
        return successResponse(res, result, 'Notification deleted successfully');
    } catch (error) {
        next(error);
    }
};

// Register device for push notifications
exports.registerDevice = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { token, deviceType } = req.body;

        const result = await notificationService.registerDeviceToken(userId, token, deviceType);
        return successResponse(res, result, 'Device registered successfully');
    } catch (error) {
        next(error);
    }
};

// Unregister device
exports.unregisterDevice = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { token } = req.body;

        const result = await notificationService.unregisterDeviceToken(userId, token);
        return successResponse(res, result, 'Device unregistered successfully');
    } catch (error) {
        next(error);
    }
};