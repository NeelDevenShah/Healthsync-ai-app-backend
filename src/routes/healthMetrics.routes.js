const express = require('express');
const router = express.Router();
const healthMetricController = require('../controllers/healthMetric.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate, healthMetricValidation, paginationValidation } = require('../utils/validation.utils');

// All routes require authentication as patient
router.use(authenticate);
router.use(authorize('patient'));

// Record new health metric
router.post(
    '/',
    validate(healthMetricValidation.create),
    healthMetricController.recordHealthMetric
);

// Get health metrics
router.get(
    '/',
    validate(paginationValidation),
    healthMetricController.getHealthMetrics
);

// Get dashboard summary of health metrics
router.get(
    '/dashboard',
    healthMetricController.getDashboard
);

// Get abnormal health readings
router.get(
    '/abnormal',
    healthMetricController.getAbnormalReadings
);

// Get personalized health recommendations
router.get(
    '/recommendations',
    healthMetricController.getRecommendations
);

module.exports = router;