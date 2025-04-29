const medicationService = require('../services/medication.service');
const { successResponse, errorResponse } = require('../utils/response.utils');

// Upload prescription image
exports.uploadPrescription = async (req, res, next) => {
    try {
        const patientId = req.user._id;
        const { prescribedBy, prescribedDate } = req.body;

        // Check if file was uploaded
        if (!req.file) {
            return errorResponse(res, 'Prescription image is required', 400);
        }

        const result = await medicationService.uploadPrescription(
            patientId,
            req.file,
            prescribedBy,
            prescribedDate
        );

        return successResponse(res, result, 'Prescription uploaded successfully', 201);
    } catch (error) {
        next(error);
    }
};

// Get medication details
exports.getMedication = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;
        const { id } = req.params;

        const result = await medicationService.getMedication(id, userId, userRole);
        return successResponse(res, result, 'Medication retrieved successfully');
    } catch (error) {
        next(error);
    }
};

// Update medication details
exports.updateMedication = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;
        const { id } = req.params;
        const updateData = req.body;

        const result = await medicationService.updateMedication(id, updateData, userId, userRole);
        return successResponse(res, result, 'Medication updated successfully');
    } catch (error) {
        next(error);
    }
};

// Parse prescription using AI
exports.parsePrescription = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await medicationService.processPrescription(id);
        return successResponse(res, result, 'Prescription parsed successfully');
    } catch (error) {
        next(error);
    }
};

// Mark medication as taken
exports.markMedicationTaken = async (req, res, next) => {
    try {
        const patientId = req.user._id;
        const { id } = req.params;
        const { medicationIndex, scheduleIndex, takenAt } = req.body;

        const result = await medicationService.markMedicationTaken(
            id,
            medicationIndex,
            scheduleIndex,
            patientId,
            takenAt
        );

        return successResponse(res, result, 'Medication marked as taken');
    } catch (error) {
        next(error);
    }
};

// Get upcoming medication schedules
exports.getUpcomingMedications = async (req, res, next) => {
    try {
        const patientId = req.user._id;
        const days = parseInt(req.query.days || '1', 10);

        const result = await medicationService.getUpcomingMedications(patientId, days);
        return successResponse(res, result, 'Upcoming medications retrieved successfully');
    } catch (error) {
        next(error);
    }
};