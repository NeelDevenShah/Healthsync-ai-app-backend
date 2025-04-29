const express = require('express');
const router = express.Router();
const diagnosisController = require('../controllers/diagnosis.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate, diagnosisValidation } = require('../utils/validation.utils');
const { upload } = require('../middleware/upload.middleware');

// All routes require authentication
router.use(authenticate);

// Create new diagnosis (patients only)
router.post(
    '/',
    authorize('patient'),
    validate(diagnosisValidation.create),
    diagnosisController.startDiagnosis
);

// Get diagnosis details (patients and doctors)
router.get('/:id', diagnosisController.getDiagnosis);

// Add message to diagnosis (patients only)
router.put(
    '/:id/message',
    authorize('patient'),
    validate(diagnosisValidation.message),
    upload.array('attachments', 5), // Allow up to 5 attachments
    diagnosisController.addMessage
);

// Complete initial AI diagnosis (patients only)
router.put(
    '/:id/complete',
    authorize('patient'),
    diagnosisController.completeDiagnosis
);

// Select/modify recommended doctor (patients only)
router.put(
    '/:id/doctor',
    authorize('patient'),
    diagnosisController.selectDoctor
);

// Modify suggested tests (doctors only)
router.put(
    '/:id/tests',
    authorize('doctor'),
    diagnosisController.modifyTests
);

// Approve diagnosis and tests (doctors only)
router.put(
    '/:id/approve',
    authorize('doctor'),
    diagnosisController.approveDiagnosis
);

module.exports = router;