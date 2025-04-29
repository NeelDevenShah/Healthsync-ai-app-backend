const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patient.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate, paginationValidation } = require('../utils/validation.utils');

// All routes require authentication as patient
router.use(authenticate);
router.use(authorize('patient'));

// Patient profile routes
router.get('/profile', patientController.getProfile);
router.put('/profile', patientController.updateProfile);

// Patient data routes
router.get('/appointments', validate(paginationValidation), patientController.getAppointments);
router.get('/diagnoses', validate(paginationValidation), patientController.getDiagnoses);
router.get('/medications', patientController.getMedications);
router.get('/reports', validate(paginationValidation), patientController.getReports);

// Health metrics routes
router.get('/health-metrics', validate(paginationValidation), patientController.getHealthMetrics);
router.post('/health-metrics', patientController.addHealthMetric);
router.get('/health-metrics/dashboard', patientController.getHealthDashboard);
router.get('/health-metrics/abnormal', patientController.getAbnormalReadings);
router.get('/health-metrics/recommendations', patientController.getHealthRecommendations);

// Actions
router.patch('/appointments/:id/cancel', patientController.cancelAppointment);
router.get('/medications/upcoming', patientController.getUpcomingMedications);

module.exports = router;