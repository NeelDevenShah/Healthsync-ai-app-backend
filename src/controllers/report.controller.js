const reportService = require('../services/report.service');
const { successResponse, errorResponse } = require('../utils/response.utils');

// Upload new medical report
exports.uploadReport = async (req, res, next) => {
    try {
        const patientId = req.user._id;
        const reportData = req.body;

        // Check if file was uploaded
        if (!req.file) {
            console.log("no file")
            return errorResponse(res, 'Report file is required', 400);
        }

        const result = await reportService.uploadReport(reportData, req.file, patientId);
        return successResponse(res, result, 'Report uploaded successfully', 201);
    } catch (error) {
        next(error);
    }
};

// Get report details
exports.getReport = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;
        const { id } = req.params;

        const result = await reportService.getReport(id, userId, userRole);
        return successResponse(res, result, 'Report retrieved successfully');
    } catch (error) {
        next(error);
    }
};

// Add/update doctor notes on report
exports.updateReportNotes = async (req, res, next) => {
    try {
        const doctorId = req.user._id;
        const { id } = req.params;
        const { notes } = req.body;

        const result = await reportService.updateReportNotes(id, doctorId, notes);
        return successResponse(res, result, 'Report notes updated successfully');
    } catch (error) {
        next(error);
    }
};

// Process report with AI (manual trigger)
exports.processReport = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await reportService.processReportAiSummary(id);
        return successResponse(res, result, 'Report processed successfully');
    } catch (error) {
        next(error);
    }
};

// Get pending reports
exports.getPendingReports = async (req, res, next) => {
    try {
        const { diagnosisId } = req.params;

        const result = await reportService.checkPendingReports(diagnosisId);
        return successResponse(res, result, 'Pending reports retrieved successfully');
    } catch (error) {
        next(error);
    }
};