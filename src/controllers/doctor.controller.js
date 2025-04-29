const authService = require('../services/auth.service');
const diagnosisService = require('../services/diagnosis.service');
const appointmentService = require('../services/appointment.service');
const reportService = require('../services/report.service');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response.utils');
const diagnosisModel = require('../models/diagnosis.model');

// Get doctor profile
exports.getProfile = async (req, res, next) => {
    try {
        const doctorId = req.user._id;
        const result = await authService.getProfile(doctorId);
        return successResponse(res, result, 'Doctor profile retrieved successfully');
    } catch (error) {
        next(error);
    }
};

// Update doctor profile
exports.updateProfile = async (req, res, next) => {
    try {
        const doctorId = req.user._id;
        const updateData = req.body;
        const result = await authService.updateProfile(doctorId, updateData);
        return successResponse(res, result, 'Doctor profile updated successfully');
    } catch (error) {
        next(error);
    }
};

// Get doctor appointments
exports.getAppointments = async (req, res, next) => {
    try {
        const doctorId = req.user._id;
        const filters = {
            status: req.query.status,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            patientId: req.query.patientId
        };

        const result = await appointmentService.getDoctorAppointments(doctorId, filters);
        return successResponse(res, result, 'Doctor appointments retrieved successfully');
    } catch (error) {
        next(error);
    }
};

// Get doctor's patients
exports.getPatients = async (req, res, next) => {
    try {
        const doctorId = req.user._id;

        // Get unique patients from appointments
        const appointments = await appointmentService.getDoctorAppointments(doctorId, {});

        // diagnoses
        const diagnoses = await diagnosisModel.find({ "suggestedDoctor.doctorId": doctorId, "suggestedDoctor.isConfirmed": true });


        // Add patients from diagnoses
        let patientIds = [
            ...appointments.map(app => app.patientId._id.toString()),
            ...diagnoses.map(diagnosis => diagnosis.patientId.toString())
        ];
        // Extract unique patient IDs
        patientIds = [...new Set(patientIds)];

        // Get patient details
        const patients = [];
        for (const patientId of patientIds) {
            const patient = await authService.getProfile(patientId);
            patients.push(patient);
        }

        return successResponse(res, patients, 'Doctor\'s patients retrieved successfully');
    } catch (error) {
        next(error);
    }
};

// Get doctor's schedule
exports.getSchedule = async (req, res, next) => {
    try {
        const doctorId = req.user._id;
        const doctor = await authService.getProfile(doctorId);

        return successResponse(res, doctor.availableSlots, 'Doctor schedule retrieved successfully');
    } catch (error) {
        next(error);
    }
};

// Update doctor's schedule
exports.updateSchedule = async (req, res, next) => {
    try {
        const doctorId = req.user._id;
        const { availableSlots } = req.body;

        if (!availableSlots || !Array.isArray(availableSlots)) {
            return errorResponse(res, 'Available slots must be an array', 400);
        }

        const result = await authService.updateProfile(doctorId, { availableSlots });
        return successResponse(res, result.availableSlots, 'Doctor schedule updated successfully');
    } catch (error) {
        next(error);
    }
};

// Get diagnoses pending review
exports.getPendingDiagnoses = async (req, res, next) => {
    try {
        const doctorId = req.user._id;

        const result = await diagnosisService.getDoctorPendingDiagnoses(doctorId);
        return successResponse(res, result, 'Pending diagnoses retrieved successfully');
    } catch (error) {
        next(error);
    }
};

// Get reports pending review
exports.getPendingReports = async (req, res, next) => {
    try {
        const doctorId = req.user._id;

        const result = await reportService.getDoctorPendingReports(doctorId);
        return successResponse(res, result, 'Pending reports retrieved successfully');
    } catch (error) {
        next(error);
    }
};

// Approve diagnosis
exports.approveDiagnosis = async (req, res, next) => {
    try {
        const doctorId = req.user._id;
        const { id } = req.params;
        const modifications = req.body;

        const result = await diagnosisService.approveDiagnosis(id, doctorId, modifications);
        return successResponse(res, result, 'Diagnosis approved successfully');
    } catch (error) {
        next(error);
    }
};

// Create appointment
exports.createAppointment = async (req, res, next) => {
    try {
        const doctorId = req.user._id;
        const appointmentData = req.body;

        const result = await appointmentService.createAppointment(appointmentData, doctorId);
        return successResponse(res, result, 'Appointment created successfully', 201);
    } catch (error) {
        next(error);
    }
};

// Update appointment
exports.updateAppointment = async (req, res, next) => {
    try {
        const doctorId = req.user._id;
        const { id } = req.params;
        const updateData = req.body;

        const result = await appointmentService.updateAppointment(id, updateData, doctorId);
        return successResponse(res, result, 'Appointment updated successfully');
    } catch (error) {
        next(error);
    }
};

// Complete appointment
exports.completeAppointment = async (req, res, next) => {
    try {
        const doctorId = req.user._id;
        const { id } = req.params;
        const completionData = req.body;

        const result = await appointmentService.completeAppointment(id, doctorId, completionData);
        return successResponse(res, result, 'Appointment completed successfully');
    } catch (error) {
        next(error);
    }
};

// Cancel appointment
exports.cancelAppointment = async (req, res, next) => {
    try {
        const doctorId = req.user._id;
        const { id } = req.params;
        const { cancelReason } = req.body;

        const result = await appointmentService.cancelAppointment(id, doctorId, 'doctor', cancelReason);
        return successResponse(res, result, 'Appointment cancelled successfully');
    } catch (error) {
        next(error);
    }
};

// Review report
exports.reviewReport = async (req, res, next) => {
    try {
        const doctorId = req.user._id;
        const { id } = req.params;
        const { notes } = req.body;

        const result = await reportService.updateReportNotes(id, doctorId, notes);
        return successResponse(res, result, 'Report reviewed successfully');
    } catch (error) {
        next(error);
    }
};