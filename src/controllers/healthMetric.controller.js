const healthMetricService = require('../services/healthMetric.service');
const { successResponse, errorResponse } = require('../utils/response.utils');

// Record new health metric
exports.recordHealthMetric = async (req, res, next) => {
    try {
        const patientId = req.user._id;
        const metricData = req.body;

        const result = await healthMetricService.recordHealthMetric(patientId, metricData);
        return successResponse(res, result, 'Health metric recorded successfully', 201);
    } catch (error) {
        next(error);
    }
};

// Get health metrics
exports.getHealthMetrics = async (req, res, next) => {
    try {
        const patientId = req.user._id;
        const filters = {
            type: req.query.type,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            isAbnormal: req.query.isAbnormal === 'true',
            source: req.query.source,
            limit: parseInt(req.query.limit || '100', 10)
        };

        const result = await healthMetricService.getHealthMetrics(patientId, filters);
        return successResponse(res, result, 'Health metrics retrieved successfully');
    } catch (error) {
        next(error);
    }
};

// Get dashboard data
exports.getDashboard = async (req, res, next) => {
    try {
        const patientId = req.user._id;
        const timeframe = req.query.timeframe || '7d';

        const result = await healthMetricService.getDashboardData(patientId, timeframe);
        return successResponse(res, result, 'Dashboard data retrieved successfully');
    } catch (error) {
        next(error);
    }
};

// Get abnormal readings
exports.getAbnormalReadings = async (req, res, next) => {
    try {
        const patientId = req.user._id;
        const timeframe = req.query.timeframe || '7d';

        const result = await healthMetricService.getAbnormalReadings(patientId, timeframe);
        return successResponse(res, result, 'Abnormal readings retrieved successfully');
    } catch (error) {
        next(error);
    }
};

// Generate personalized health recommendations
exports.getRecommendations = async (req, res, next) => {
    try {
        const patientId = req.user._id;

        const result = await healthMetricService.generateRecommendations(patientId);
        return successResponse(res, result, 'Health recommendations generated successfully');
    } catch (error) {
        next(error);
    }
};