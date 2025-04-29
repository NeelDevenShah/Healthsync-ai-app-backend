const express = require('express');
const router = express.Router();
const medicationController = require('../controllers/medication.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate, medicationValidation } = require('../utils/validation.utils');
const { upload } = require('../middleware/upload.middleware');

// All routes require authentication
router.use(authenticate);

// Upload prescription image (patients only)
router.post(
    '/',
    authorize('patient'),
    upload.single('prescriptionImage'),
    medicationController.uploadPrescription
);

// Get medication details
router.get('/:id', medicationController.getMedication);

// Update medication details
router.put(
    '/:id',
    validate(medicationValidation.create),
    medicationController.updateMedication
);

// Parse prescription using AI
router.post(
    '/:id/parse',
    medicationController.parsePrescription
);

// Mark medication as taken (patients only)
router.put(
    '/:id/taken',
    authorize('patient'),
    medicationController.markMedicationTaken
);

// Get upcoming medication schedules (patients only)
router.get(
    '/upcoming',
    authorize('patient'),
    medicationController.getUpcomingMedications
);

module.exports = router;