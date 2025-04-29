const authService = require('../services/auth.service');
const diagnosisService = require('../services/diagnosis.service');
const appointmentService = require('../services/appointment.service');
const reportService = require('../services/report.service');
const medicationService = require('../services/medication.service');
const healthMetricService = require('../services/healthMetric.service');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response.utils');

// Get patient profile
exports.getProfile = async (req, res, next) => {
    try {
        const patientId = req.user._id;
        const result = await authService.getProfile(patientId);
        return successResponse(res, result, 'Patient profile retrieved successfully');
    } catch (error) {
        next(error);
    }
};

// Update patient profile
exports.updateProfile = async (req, res, next) => {
    try {
        const patientId = req.user._id;
        const updateData = req.body;
        const result = await authService.updateProfile(patientId, updateData);
        return successResponse(res, result, 'Patient profile updated successfully');
    } catch (error) {
        next(error);
    }
};

// Get patient appointments
exports.getAppointments = async (req, res, next) => {
    try {
        const patientId = req.user._id;
        const filters = {
            status: req.query.status,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            doctorId: req.query.doctorId
        };

        const result = await appointmentService.getPatientAppointments(patientId, filters);
        return successResponse(res, result, 'Patient appointments retrieved successfully');
    } catch (error) {
        next(error);
    }
};

// Get patient diagnoses
exports.getDiagnoses = async (req, res, next) => {
    try {
        const patientId = req.user._id;
        const filters = {
            status: req.query.status,
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };

        const result = await diagnosisService.getPatientDiagnoses(patientId, filters);
        return successResponse(res, result, 'Patient diagnoses retrieved successfully');
    } catch (error) {
        next(error);
    }
};

// Get patient medications
exports.getMedications = async (req, res, next) => {
    try {
        const patientId = req.user._id;
        const includeExpired = req.query.includeExpired === 'true';

        const result = await medicationService.getPatientMedications(patientId, includeExpired);
        return successResponse(res, result, 'Patient medications retrieved successfully');
    } catch (error) {
        next(error);
    }
};

// Get patient reports
exports.getReports = async (req, res, next) => {
    try {
        const patientId = req.user._id;
        const filters = {
            type: req.query.type,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            diagnosisId: req.query.diagnosisId,
            appointmentId: req.query.appointmentId,
            isReviewed: req.query.isReviewed === 'true'
        };

        const result = await reportService.getPatientReports(patientId, filters);
        return successResponse(res, result, 'Patient reports retrieved successfully');
    } catch (error) {
        next(error);
    }
};

// Get patient health metrics
exports.getHealthMetrics = async (req, res, next) => {
    try {
        const patientId = req.user._id;
        const filters = {
            type: req.query.type,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            isAbnormal: req.query.isAbnormal === 'true',
            source: req.query.source,
            limit: req.query.limit
        };

        const result = await healthMetricService.getHealthMetrics(patientId, filters);
        return successResponse(res, result, 'Patient health metrics retrieved successfully');
    } catch (error) {
        next(error);
    }
};

// Add health metric (manual entry)
exports.addHealthMetric = async (req, res, next) => {
    try {
        const patientId = req.user._id;
        const metricData = req.body;

        const result = await healthMetricService.recordHealthMetric(patientId, metricData);
        return successResponse(res, result, 'Health metric recorded successfully', 201);
    } catch (error) {
        next(error);
    }
};

// Get health dashboard data
exports.getHealthDashboard = async (req, res, next) => {
    try {
        const patientId = req.user._id;
        const timeframe = req.query.timeframe || '7d';

        const result = await healthMetricService.getDashboardData(patientId, timeframe);
        return successResponse(res, result, 'Health dashboard data retrieved successfully');
    } catch (error) {
        next(error);
    }
};

// Get abnormal health readings
exports.getAbnormalReadings = async (req, res, next) => {
    try {
        const patientId = req.user._id;
        const timeframe = req.query.timeframe || '7d';

        const result = await healthMetricService.getAbnormalReadings(patientId, timeframe);
        return successResponse(res, result, 'Abnormal health readings retrieved successfully');
    } catch (error) {
        next(error);
    }
};

// Get personalized health recommendations
exports.getHealthRecommendations = async (req, res, next) => {
    try {
        const patientId = req.user._id;

        const result = await healthMetricService.generateRecommendations(patientId);
        return successResponse(res, result, 'Health recommendations generated successfully');
    } catch (error) {
        next(error);
    }
};

// Cancel appointment
exports.cancelAppointment = async (req, res, next) => {
    try {
        const patientId = req.user._id;
        const { id } = req.params;
        const { cancelReason } = req.body;

        const result = await appointmentService.cancelAppointment(id, patientId, 'patient', cancelReason);
        return successResponse(res, result, 'Appointment cancelled successfully');
    } catch (error) {
        next(error);
    }
};

// Get upcoming medications
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