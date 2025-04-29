const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointment.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate, appointmentValidation } = require('../utils/validation.utils');

// All routes require authentication
router.use(authenticate);

// Create new appointment (doctors only)
router.post(
    '/',
    authorize('doctor'),
    validate(appointmentValidation.create),
    appointmentController.createAppointment
);

// Get appointment details (patients and doctors)
router.get('/:id', appointmentController.getAppointment);

// Update appointment (doctors only)
router.put(
    '/:id',
    authorize('doctor'),
    validate(appointmentValidation.update),
    appointmentController.updateAppointment
);

// Cancel appointment (patients and doctors)
router.delete('/:id', appointmentController.cancelAppointment);

// Get appointment required reports
router.get('/:id/reports', appointmentController.getAppointmentReports);

// Complete appointment (doctors only)
router.post(
    '/:id/complete',
    authorize('doctor'),
    appointmentController.completeAppointment
);

module.exports = router;