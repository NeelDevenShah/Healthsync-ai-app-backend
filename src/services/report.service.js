const Report = require('../models/report.model');
const Appointment = require('../models/appointment.model');
const Diagnosis = require('../models/diagnosis.model');
const aiService = require('./ai.service');
const notificationService = require('./notification.service');
const { AppError } = require('../middleware/error.middleware');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config/config');

// Upload new medical report
exports.uploadReport = async (reportData, fileInfo, patientId) => {
    try {
        const { appointmentId, diagnosisId, type, name } = reportData;

        // Validate appointment if provided
        if (appointmentId) {
            const appointment = await Appointment.findById(appointmentId);
            if (!appointment) {
                throw new AppError('Appointment not found', 404);
            }

            // Check if patient is authorized
            if (appointment.patientId.toString() !== patientId.toString()) {
                throw new AppError('Not authorized to upload report for this appointment', 403);
            }
        }

        // Validate diagnosis if provided
        if (diagnosisId) {
            const diagnosis = await Diagnosis.findById(diagnosisId);
            if (!diagnosis) {
                throw new AppError('Diagnosis not found', 404);
            }

            // Check if patient is authorized
            if (diagnosis.patientId.toString() !== patientId.toString()) {
                throw new AppError('Not authorized to upload report for this diagnosis', 403);
            }
        }

        // Create report
        const report = new Report({
            patientId,
            appointmentId: appointmentId || null,
            diagnosisId: diagnosisId || null,
            type,
            name,
            uploadedDate: new Date(),
            fileUrl: fileInfo.path,
            originalFilename: fileInfo.originalname,
            mimeType: fileInfo.mimetype,
            fileSize: fileInfo.size,
            aiSummaryStatus: 'pending'
        });

        await report.save();

        // Process report asynchronously if it's a common format
        if (
            fileInfo.mimetype === 'application/pdf' ||
            fileInfo.mimetype.includes('image/') ||
            fileInfo.mimetype.includes('text/') ||
            fileInfo.mimetype.includes('excel') ||
            fileInfo.mimetype.includes('spreadsheet')
        ) {
            // Start AI processing in background
            this.processReportAiSummary(report._id).catch(err => {
                console.error('Background report analysis failed:', err);
            });
        }

        // If associated with appointment, update appointment
        if (appointmentId) {
            const appointment = await Appointment.findById(appointmentId);

            // Check if this report is required
            const isRequired = appointment.requiredReports.some(
                reqReport => reqReport.toString() === report._id.toString()
            );

            if (!isRequired) {
                // Add to required reports if not already there
                appointment.requiredReports.push(report._id);
                await appointment.save();
            }

            // Notify doctor about new report
            await notificationService.createReportUploadNotification(report, appointment.doctorId);
        }

        // If associated with diagnosis, update its status if needed
        if (diagnosisId) {
            const diagnosis = await Diagnosis.findById(diagnosisId);

            if (diagnosis.status === 'pending_reports') {
                // Check if all required tests now have reports
                const pendingTests = await this.checkPendingReports(diagnosisId);

                if (pendingTests.length === 0) {
                    // All reports submitted, notify doctor
                    await notificationService.createAllReportsReadyNotification(diagnosis);
                }
            }

            // Notify doctor about new report
            if (diagnosis.finalDoctorId) {
                await notificationService.createReportUploadNotification(report, diagnosis.finalDoctorId);
            }
        }

        return report;
    } catch (error) {
        console.error('Upload report error:', error);
        throw new AppError('Failed to upload report', 500);
    }
};

// Process report with AI to generate summary
exports.processReportAiSummary = async (reportId) => {
    try {
        const report = await Report.findById(reportId);
        if (!report) {
            throw new AppError('Report not found', 404);
        }

        // Update status to processing
        report.aiSummaryStatus = 'processing';
        await report.save();

        // Get report content (implementation depends on file type)
        let reportContent = '';

        try {
            // Different handling based on file type
            if (report.mimeType === 'application/pdf') {
                // For PDF, we'd need a PDF parser library
                // This is a simplified placeholder
                reportContent = `PDF Report: ${report.name}`;
            } else if (report.mimeType.includes('image/')) {
                // For images, we'd analyze them with vision API
                reportContent = `Image Report: ${report.name}`;
            } else if (report.mimeType.includes('text/')) {
                // For text files, read directly
                const filePath = path.join(config.FILE_UPLOAD_PATH, report.fileUrl);
                reportContent = await fs.readFile(filePath, 'utf8');
            } else {
                // Default fallback
                reportContent = `Report: ${report.name} (${report.type})`;
            }
        } catch (fileError) {
            console.error('Error reading file content:', fileError);
            report.aiSummaryStatus = 'failed';
            await report.save();
            throw new AppError('Failed to read report content', 500);
        }

        // Get diagnosis context if available
        let diagnosisSummary = null;
        if (report.diagnosisId) {
            const diagnosis = await Diagnosis.findById(report.diagnosisId);
            if (diagnosis && diagnosis.aiSummary) {
                diagnosisSummary = diagnosis.aiSummary;
            }
        }

        // Generate AI summary
        const aiSummary = await aiService.analyzeMedicalReport(
            report.type,
            reportContent,
            diagnosisSummary
        );

        // Update report with summary
        report.aiSummary = aiSummary;
        report.aiSummaryStatus = 'completed';
        await report.save();

        // Create notification that report analysis is complete
        await notificationService.createReportAnalysisNotification(report);

        return report;
    } catch (error) {
        console.error('Process report AI summary error:', error);

        // Update status to failed
        const report = await Report.findById(reportId);
        if (report) {
            report.aiSummaryStatus = 'failed';
            await report.save();
        }

        throw new AppError('Failed to process report with AI', 500);
    }
};

// Get report details
exports.getReport = async (reportId, userId, role) => {
    try {
        // Get report with populated fields
        const report = await Report.findById(reportId)
            .populate('patientId', 'name')
            .populate('reviewedBy', 'name');

        if (!report) {
            throw new AppError('Report not found', 404);
        }

        // Check authorization
        const isPatient = role === 'patient' && report.patientId._id.toString() === userId.toString();

        let isAuthorizedDoctor = false;
        if (role === 'doctor') {
            // Check if doctor is associated with this patient's appointment or diagnosis
            if (report.appointmentId) {
                const appointment = await Appointment.findById(report.appointmentId);
                isAuthorizedDoctor = appointment && appointment.doctorId.toString() === userId.toString();
            }

            if (!isAuthorizedDoctor && report.diagnosisId) {
                const diagnosis = await Diagnosis.findById(report.diagnosisId);
                isAuthorizedDoctor = diagnosis && diagnosis.finalDoctorId &&
                    diagnosis.finalDoctorId.toString() === userId.toString();
            }
        }

        if (!isPatient && !isAuthorizedDoctor) {
            throw new AppError('Not authorized to access this report', 403);
        }

        return report;
    } catch (error) {
        console.error('Get report error:', error);
        throw new AppError('Failed to get report details', 500);
    }
};

// Add/update doctor notes on report
exports.updateReportNotes = async (reportId, doctorId, notes) => {
    try {
        // Get report
        const report = await Report.findById(reportId);
        if (!report) {
            throw new AppError('Report not found', 404);
        }

        // Check if doctor is authorized
        let isAuthorizedDoctor = false;

        if (report.appointmentId) {
            const appointment = await Appointment.findById(report.appointmentId);
            isAuthorizedDoctor = appointment && appointment.doctorId.toString() === doctorId.toString();
        }

        if (!isAuthorizedDoctor && report.diagnosisId) {
            const diagnosis = await Diagnosis.findById(report.diagnosisId);
            isAuthorizedDoctor = diagnosis && diagnosis.finalDoctorId &&
                diagnosis.finalDoctorId.toString() === doctorId.toString();
        }

        if (!isAuthorizedDoctor) {
            throw new AppError('Not authorized to add notes to this report', 403);
        }

        // Update report
        report.doctorNotes = notes;
        report.isReviewed = true;
        report.reviewedBy = doctorId;
        report.reviewedAt = Date.now();

        await report.save();

        // Create notification for patient that report was reviewed
        await notificationService.createReportReviewedNotification(report);

        return report;
    } catch (error) {
        console.error('Update report notes error:', error);
        throw new AppError('Failed to update report notes', 500);
    }
};

// Get all reports for a patient
exports.getPatientReports = async (patientId, filters = {}) => {
    try {
        const query = { patientId };

        // Apply type filter if provided
        if (filters.type) {
            query.type = filters.type;
        }

        // Apply date range filter if provided
        if (filters.startDate && filters.endDate) {
            query.uploadedDate = {
                $gte: new Date(filters.startDate),
                $lte: new Date(filters.endDate)
            };
        }

        // Apply diagnosis filter if provided
        if (filters.diagnosisId) {
            query.diagnosisId = filters.diagnosisId;
        }

        // Apply appointment filter if provided
        if (filters.appointmentId) {
            query.appointmentId = filters.appointmentId;
        }

        // Apply review status filter if provided
        if (filters.isReviewed !== undefined) {
            query.isReviewed = filters.isReviewed;
        }

        const reports = await Report.find(query)
            .sort({ uploadedDate: -1 });

        return reports;
    } catch (error) {
        console.error('Get patient reports error:', error);
        throw new AppError('Failed to get patient reports', 500);
    }
};

// Get all reports pending review for a doctor
exports.getDoctorPendingReports = async (doctorId) => {
    try {
        // Get appointments for this doctor
        const appointments = await Appointment.find({ doctorId });
        const appointmentIds = appointments.map(app => app._id);

        // Get diagnoses for this doctor
        const diagnoses = await Diagnosis.find({ finalDoctorId: doctorId });
        const diagnosisIds = diagnoses.map(diag => diag._id);

        // Find unreviewed reports
        const pendingReports = await Report.find({
            $or: [
                { appointmentId: { $in: appointmentIds } },
                { diagnosisId: { $in: diagnosisIds } }
            ],
            isReviewed: false
        })
            .populate('patientId', 'name')
            .sort({ uploadedDate: -1 });

        return pendingReports;
    } catch (error) {
        console.error('Get doctor pending reports error:', error);
        throw new AppError('Failed to get pending reports for doctor', 500);
    }
};

// Check for pending required reports for a diagnosis
exports.checkPendingReports = async (diagnosisId) => {
    try {
        const diagnosis = await Diagnosis.findById(diagnosisId);
        if (!diagnosis) {
            throw new AppError('Diagnosis not found', 404);
        }

        // Get all approved tests
        const approvedTests = diagnosis.suggestedTests.filter(test => test.isApproved);

        // Get all submitted reports for this diagnosis
        const submittedReports = await Report.find({ diagnosisId });

        // Determine which tests are still pending reports
        const pendingTests = approvedTests.filter(test => {
            // Check if a report exists for this test
            return !submittedReports.some(report =>
                report.name.toLowerCase().includes(test.name.toLowerCase()) ||
                report.type.toLowerCase().includes(test.name.toLowerCase())
            );
        });

        return pendingTests;
    } catch (error) {
        console.error('Check pending reports error:', error);
        throw new AppError('Failed to check pending reports', 500);
    }
};