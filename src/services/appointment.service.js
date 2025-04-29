const Appointment = require('../models/appointment.model');
const Diagnosis = require('../models/diagnosis.model');
const User = require('../models/user.model');
const Doctor = require('../models/doctor.model');
const Patient = require('../models/patient.model');
const { AppError } = require('../middleware/error.middleware');
const notificationService = require('./notification.service');
const calendarService = require('./calendar.service');

// Create new appointment (only doctors can create appointments)
exports.createAppointment = async (appointmentData, doctorId) => {
    try {
        const { patientId, diagnosisId, date, time, requiredReports, notes } = appointmentData;

        // Validate patient exists
        const patient = await Patient.findById(patientId);
        if (!patient) {
            throw new AppError('Patient not found', 404);
        }

        // Validate doctor exists
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            throw new AppError('Doctor not found', 404);
        }

        // Validate diagnosis if provided
        if (diagnosisId) {
            const diagnosis = await Diagnosis.findById(diagnosisId);
            if (!diagnosis) {
                throw new AppError('Diagnosis not found', 404);
            }

            // Check if doctor is authorized for this diagnosis
            if (diagnosis.finalDoctorId && diagnosis.finalDoctorId.toString() !== doctorId.toString()) {
                throw new AppError('Not authorized to create appointment for this diagnosis', 403);
            }

            // Update diagnosis with appointment info
            diagnosis.status = 'pending_reports';
            await diagnosis.save();
        }

        // Create appointment
        const appointment = new Appointment({
            patientId,
            doctorId,
            diagnosisId,
            date,
            time,
            requiredReports: requiredReports || [],
            notes: {
                preAppointment: notes?.preAppointment || ''
            },
            status: 'scheduled'
        });

        await appointment.save();

        // Send notification to patient
        await notificationService.createAppointmentNotification(appointment);

        // If patient has calendar connected, sync appointment
        if (patient.calendarConnected) {
            try {
                const calendarEventId = await calendarService.syncAppointmentToCalendar(
                    patientId,
                    appointment._id
                );

                if (calendarEventId) {
                    appointment.calendarEventId = calendarEventId;
                    await appointment.save();
                }
            } catch (calendarError) {
                console.error('Calendar sync error:', calendarError);
                // Continue even if calendar sync fails
            }
        }

        return appointment;
    } catch (error) {
        console.error('Create appointment error:', error);
        throw new AppError('Failed to create appointment', 500);
    }
};

// Get appointment details
exports.getAppointment = async (appointmentId, userId, role) => {
    try {
        // Get appointment with populated fields
        const appointment = await Appointment.findById(appointmentId)
            .populate('patientId', 'name')
            .populate('doctorId', 'name specialization')
            .populate('diagnosisId', 'aiSummary')
            .populate('requiredReports', 'name type uploadedDate isReviewed');

        if (!appointment) {
            throw new AppError('Appointment not found', 404);
        }

        // Check authorization
        if (
            (role === 'patient' && appointment.patientId._id.toString() !== userId.toString()) &&
            (role === 'doctor' && appointment.doctorId._id.toString() !== userId.toString())
        ) {
            throw new AppError('Not authorized to access this appointment', 403);
        }

        return appointment;
    } catch (error) {
        console.error('Get appointment error:', error);
        throw new AppError('Failed to get appointment details', 500);
    }
};

// Update appointment (doctors only)
exports.updateAppointment = async (appointmentId, updateData, doctorId) => {
    try {
        // Get appointment
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            throw new AppError('Appointment not found', 404);
        }

        // Check if doctor is authorized
        if (appointment.doctorId.toString() !== doctorId.toString()) {
            throw new AppError('Not authorized to update this appointment', 403);
        }

        // Prevent updating certain fields
        delete updateData.patientId;
        delete updateData.doctorId;
        delete updateData.createdAt;

        // If status is being updated to completed, add completion timestamp
        if (updateData.status === 'completed' && appointment.status !== 'completed') {
            appointment.checkedIn = true;
            appointment.checkedInAt = Date.now();
        }

        // If appointment is being cancelled, record who cancelled it
        if (updateData.status === 'cancelled' && appointment.status !== 'cancelled') {
            appointment.cancelledBy = doctorId;

            // If there's a calendar event, remove it
            if (appointment.calendarEventId) {
                try {
                    await calendarService.removeCalendarEvent(
                        appointment.patientId,
                        appointment.calendarEventId
                    );
                } catch (calendarError) {
                    console.error('Calendar delete error:', calendarError);
                    // Continue even if calendar delete fails
                }
            }
        }

        // Update appointment
        const updatedAppointment = await Appointment.findByIdAndUpdate(
            appointmentId,
            { $set: updateData },
            { new: true, runValidators: true }
        )
            .populate('patientId', 'name')
            .populate('doctorId', 'name specialization');

        // Create notification for patient about the update
        await notificationService.createAppointmentUpdateNotification(updatedAppointment);

        // If date or time updated and patient has calendar connected, update calendar
        if (
            (updateData.date || updateData.time) &&
            appointment.calendarEventId
        ) {
            const patient = await Patient.findById(appointment.patientId);

            if (patient.calendarConnected) {
                try {
                    await calendarService.updateCalendarEvent(
                        appointment.patientId,
                        appointment.calendarEventId,
                        updatedAppointment
                    );
                } catch (calendarError) {
                    console.error('Calendar update error:', calendarError);
                    // Continue even if calendar update fails
                }
            }
        }

        return updatedAppointment;
    } catch (error) {
        console.error('Update appointment error:', error);
        throw new AppError('Failed to update appointment', 500);
    }
};

// Cancel appointment (can be done by patient or doctor)
exports.cancelAppointment = async (appointmentId, userId, role, cancelReason) => {
    try {
        // Get appointment
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            throw new AppError('Appointment not found', 404);
        }

        // Check if user is authorized
        if (
            (role === 'patient' && appointment.patientId.toString() !== userId.toString()) &&
            (role === 'doctor' && appointment.doctorId.toString() !== userId.toString())
        ) {
            throw new AppError('Not authorized to cancel this appointment', 403);
        }

        // Check if appointment is already cancelled or completed
        if (appointment.status === 'cancelled') {
            throw new AppError('This appointment is already cancelled', 400);
        }

        if (appointment.status === 'completed') {
            throw new AppError('Cannot cancel a completed appointment', 400);
        }

        // Update appointment status to cancelled
        appointment.status = 'cancelled';
        appointment.cancelledBy = userId;
        appointment.cancelReason = cancelReason || '';

        await appointment.save();

        // If there's a calendar event, remove it
        if (appointment.calendarEventId) {
            try {
                await calendarService.removeCalendarEvent(
                    appointment.patientId,
                    appointment.calendarEventId
                );
            } catch (calendarError) {
                console.error('Calendar delete error:', calendarError);
                // Continue even if calendar delete fails
            }
        }

        // Create notifications for both parties
        if (role === 'patient') {
            await notificationService.createAppointmentCancellationNotification(
                appointment,
                'patient_cancelled'
            );
        } else {
            await notificationService.createAppointmentCancellationNotification(
                appointment,
                'doctor_cancelled'
            );
        }

        return appointment;
    } catch (error) {
        console.error('Cancel appointment error:', error);
        throw new AppError('Failed to cancel appointment', 500);
    }
};

// Get appointments for patient
exports.getPatientAppointments = async (patientId, filters = {}) => {
    try {
        const query = { patientId };

        // Apply status filter if provided
        if (filters.status) {
            query.status = filters.status;
        }

        // Apply date range filter if provided
        if (filters.startDate && filters.endDate) {
            query.date = {
                $gte: new Date(filters.startDate),
                $lte: new Date(filters.endDate)
            };
        }

        // Apply doctor filter if provided
        if (filters.doctorId) {
            query.doctorId = filters.doctorId;
        }

        const appointments = await Appointment.find(query)
            .populate('doctorId', 'name specialization')
            .populate('diagnosisId', 'aiSummary')
            .sort({ date: filters.status === 'completed' ? -1 : 1 });

        return appointments;
    } catch (error) {
        console.error('Get patient appointments error:', error);
        throw new AppError('Failed to get patient appointments', 500);
    }
};

// Get appointments for doctor
exports.getDoctorAppointments = async (doctorId, filters = {}) => {
    try {
        const query = { doctorId };

        // Apply status filter if provided
        if (filters.status) {
            query.status = filters.status;
        }

        // Apply date range filter if provided
        if (filters.startDate && filters.endDate) {
            query.date = {
                $gte: new Date(filters.startDate),
                $lte: new Date(filters.endDate)
            };
        }

        // Apply patient filter if provided
        if (filters.patientId) {
            query.patientId = filters.patientId;
        }


        const appointments = await Appointment.find(query)
            .populate('patientId', 'name gender dateOfBirth')
            .populate('diagnosisId', 'aiSummary')
            .sort({ date: filters.status === 'completed' ? -1 : 1, 'time.start': 1 });

        return appointments;


        // find diagnosis where diagnosis.finalDoctorId is doctorId

        // const diagnosis = await Diagnosis.find({ finalDoctorId: doctorId }).populate('patientId', 'name gender dateOfBirth')

        // const response = {
        //     "diagnosisId": diagnosis._id,
        //     "patientId": diagnosis.patientId,
        //     "aiSummary": diagnosis.aiSummary,
        // }


        // console.log(response);

        // return response;
    } catch (error) {
        console.error('Get doctor appointments error:', error);
        throw new AppError('Failed to get doctor appointments', 500);
    }
};

// Complete appointment (doctors only)
exports.completeAppointment = async (appointmentId, doctorId, completionData) => {
    try {
        // Get appointment
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            throw new AppError('Appointment not found', 404);
        }

        // Check if doctor is authorized
        if (appointment.doctorId.toString() !== doctorId.toString()) {
            throw new AppError('Not authorized to complete this appointment', 403);
        }

        // Check if appointment can be completed
        if (appointment.status !== 'scheduled') {
            throw new AppError(`Cannot complete an appointment with status: ${appointment.status}`, 400);
        }

        // Update appointment
        appointment.status = 'completed';
        appointment.checkedIn = true;
        appointment.checkedInAt = completionData.checkedInAt || Date.now();

        if (completionData.notes) {
            appointment.notes.postAppointment = completionData.notes;
        }

        // Handle follow-up appointment if provided
        if (completionData.followUp && completionData.followUp.create) {
            const followUpDate = new Date(completionData.followUp.date);

            // Create follow-up appointment
            const followUpAppointment = new Appointment({
                patientId: appointment.patientId,
                doctorId: appointment.doctorId,
                diagnosisId: appointment.diagnosisId,
                date: followUpDate,
                time: {
                    start: completionData.followUp.time.start, end: completionData.followUp.time.end || null
                },
                notes: {
                    preAppointment: completionData.followUp.notes || 'Follow-up appointment'
                },
                status: 'scheduled'
            });

            await followUpAppointment.save();

            // Link the appointments
            appointment.followupAppointmentId = followUpAppointment._id;

            // Send notification for follow-up
            await notificationService.createFollowUpAppointmentNotification(followUpAppointment);

            // Sync with calendar if patient has calendar connected
            const patient = await Patient.findById(appointment.patientId);
            if (patient.calendarConnected) {
                try {
                    const calendarEventId = await calendarService.syncAppointmentToCalendar(
                        appointment.patientId,
                        followUpAppointment._id
                    );

                    if (calendarEventId) {
                        followUpAppointment.calendarEventId = calendarEventId;
                        await followUpAppointment.save();
                    }
                } catch (calendarError) {
                    console.error('Calendar sync error for follow-up:', calendarError);
                    // Continue even if calendar sync fails
                }
            }
        }

        await appointment.save();

        // If diagnosis is associated, update its status
        if (appointment.diagnosisId) {
            const diagnosis = await Diagnosis.findById(appointment.diagnosisId);
            if (diagnosis) {
                diagnosis.status = 'completed';
                await diagnosis.save();
            }
        }

        // Create notification for appointment completion
        await notificationService.createAppointmentCompletionNotification(appointment);

        return appointment;
    } catch (error) {
        console.error('Complete appointment error:', error);
        throw new AppError('Failed to complete appointment', 500);
    }
};