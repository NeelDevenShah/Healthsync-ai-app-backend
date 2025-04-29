const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate, reportValidation } = require('../utils/validation.utils');
const { upload } = require('../middleware/upload.middleware');

// All routes require authentication
router.use(authenticate);

// Upload new medical report (patients only)
router.post(
    '/',
    authorize('patient'),
    upload.single('reportFile'),
    // validate(reportValidation.upload),
    reportController.uploadReport
);

// Get report details (patients and doctors)
router.get('/:id', reportController.getReport);

// Add/update doctor notes on report (doctors only)
router.put(
    '/:id/notes',
    authorize('doctor'),
    reportController.updateReportNotes
);

// Process report with AI (manual trigger)
router.post(
    '/:id/analyze',
    reportController.processReport
);

// Get pending reports for a diagnosis
router.get(
    '/pending/:diagnosisId',
    reportController.getPendingReports
);

module.exports = router;