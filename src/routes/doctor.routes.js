const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctor.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate, paginationValidation } = require('../utils/validation.utils');

// All routes require authentication as doctor
router.use(authenticate);
router.use(authorize('doctor'));

// Doctor profile routes
router.get('/profile', doctorController.getProfile);
router.put('/profile', doctorController.updateProfile);

// Doctor data routes
router.get('/appointments', validate(paginationValidation), doctorController.getAppointments);
router.get('/patients', doctorController.getPatients);
router.get('/schedule', doctorController.getSchedule);
router.put('/schedule', doctorController.updateSchedule);

// Review routes
router.get('/pending-reviews', doctorController.getPendingDiagnoses);
router.get('/pending-reports', doctorController.getPendingReports);

// Actions
router.post('/appointments', doctorController.createAppointment);
router.put('/appointments/:id', doctorController.updateAppointment);
router.post('/appointments/:id/complete', doctorController.completeAppointment);
router.patch('/appointments/:id/cancel', doctorController.cancelAppointment);
router.put('/reports/:id/review', doctorController.reviewReport);
router.put('/diagnoses/:id/approve', doctorController.approveDiagnosis);

module.exports = router;