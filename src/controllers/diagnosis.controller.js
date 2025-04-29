const diagnosisService = require('../services/diagnosis.service');
const { successResponse, errorResponse } = require('../utils/response.utils');

// Start a new diagnosis
exports.startDiagnosis = async (req, res, next) => {
    try {
        const patientId = req.user._id;
        const { symptomDescription } = req.body;

        const result = await diagnosisService.startDiagnosis(patientId, symptomDescription);
        return successResponse(res, result, 'Diagnosis started successfully', 201);
    } catch (error) {
        next(error);
    }
};

// Get diagnosis details
exports.getDiagnosis = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;
        const { id } = req.params;

        const result = await diagnosisService.getDiagnosis(id, userId, userRole);
        return successResponse(res, result, 'Diagnosis retrieved successfully');
    } catch (error) {
        next(error);
    }
};

// Add message to diagnosis conversation
exports.addMessage = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { message, role } = req.body;

        // Build attachments array from uploaded files
        const attachments = [];
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                attachments.push({
                    type: file.mimetype.startsWith('image/') ? 'image' : 'file',
                    url: file.path,
                    originalName: file.originalname,
                    mimeType: file.mimetype
                });
            });
        }

        const result = await diagnosisService.addMessage(id, message, role, attachments);
        return successResponse(res, result, 'Message added successfully');
    } catch (error) {
        next(error);
    }
};

// Complete diagnosis
exports.completeDiagnosis = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await diagnosisService.completeDiagnosis(id);
        return successResponse(res, result, 'Diagnosis completed successfully');
    } catch (error) {
        next(error);
    }
};

// Select/modify recommended doctor
exports.selectDoctor = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { doctorId } = req.body;

        const result = await diagnosisService.selectDoctor(id, doctorId);
        return successResponse(res, result, 'Doctor selected successfully');
    } catch (error) {
        next(error);
    }
};

// Modify suggested tests (doctors only)
exports.modifyTests = async (req, res, next) => {
    try {
        const doctorId = req.user._id;
        const { id } = req.params;
        const { tests, additionalTests } = req.body;

        const modifications = {
            tests,
            additionalTests
        };

        const result = await diagnosisService.approveDiagnosis(id, doctorId, modifications);
        return successResponse(res, result, 'Tests modified successfully');
    } catch (error) {
        next(error);
    }
};

// Doctor approves diagnosis
exports.approveDiagnosis = async (req, res, next) => {
    try {
        const doctorId = req.user._id;
        const { id } = req.params;
        const modifications = req.body;

        const result = await diagnosisService.approveDiagnosis(id, doctorId, modifications);
        return successResponse(res, result, 'Diagnosis approved successfully');
    } catch (error) {
        next(error);
    }
};