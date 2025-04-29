const appointmentService = require('../services/appointment.service');
const { successResponse, errorResponse } = require('../utils/response.utils');

// Create new appointment (doctors only)
exports.createAppointment = async (req, res, next) => {
    try {
        const doctorId = req.user._id;
        const appointmentData = req.body;

        const result = await appointmentService.createAppointment(appointmentData, doctorId);
        return successResponse(res, result, 'Appointment created successfully', 201);
    } catch (error) {
        next(error);
    }
};

// Get appointment details
exports.getAppointment = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;
        const { id } = req.params;

        const result = await appointmentService.getAppointment(id, userId, userRole);
        return successResponse(res, result, 'Appointment retrieved successfully');
    } catch (error) {
        next(error);
    }
};

// Update appointment (doctors only)
exports.updateAppointment = async (req, res, next) => {
    try {
        const doctorId = req.user._id;
        const { id } = req.params;
        const updateData = req.body;

        const result = await appointmentService.updateAppointment(id, updateData, doctorId);
        return successResponse(res, result, 'Appointment updated successfully');
    } catch (error) {
        next(error);
    }
};

// Cancel appointment
exports.cancelAppointment = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;
        const { id } = req.params;
        const { cancelReason } = req.body;

        const result = await appointmentService.cancelAppointment(id, userId, userRole, cancelReason);
        return successResponse(res, result, 'Appointment cancelled successfully');
    } catch (error) {
        next(error);
    }
};

// Complete appointment (doctors only)
exports.completeAppointment = async (req, res, next) => {
    try {
        const doctorId = req.user._id;
        const { id } = req.params;
        const completionData = req.body;

        const result = await appointmentService.completeAppointment(id, doctorId, completionData);
        return successResponse(res, result, 'Appointment completed successfully');
    } catch (error) {
        next(error);
    }
};

// Get appointment reports
exports.getAppointmentReports = async (req, res, next) => {
    try {
        const { id } = req.params;

        const appointment = await appointmentService.getAppointment(
            id,
            req.user._id,
            req.user.role
        );

        if (!appointment.requiredReports || appointment.requiredReports.length === 0) {
            return successResponse(res, [], 'No reports required for this appointment');
        }

        return successResponse(
            res,
            appointment.requiredReports,
            'Appointment required reports retrieved successfully'
        );
    } catch (error) {
        next(error);
    }
};