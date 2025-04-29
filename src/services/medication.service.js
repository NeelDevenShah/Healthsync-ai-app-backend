const Medication = require('../models/medication.model');
const Patient = require('../models/patient.model');
const aiService = require('./ai.service');
const notificationService = require('./notification.service');
const calendarService = require('./calendar.service');
const { AppError } = require('../middleware/error.middleware');
const schedule = require('node-schedule');

// Upload prescription image
exports.uploadPrescription = async (patientId, fileInfo, prescribedBy = null, prescribedDate = null) => {
    try {
        // Create medication entry
        const medication = new Medication({
            patientId,
            prescriptionImage: fileInfo.path,
            prescribedBy: prescribedBy || null,
            prescribedDate: prescribedDate || new Date(),
            medications: [],
            aiParsingStatus: 'pending'
        });

        await medication.save();

        // Start AI processing in background
        this.processPrescription(medication._id).catch(err => {
            console.error('Background prescription parsing failed:', err);
        });

        return medication;
    } catch (error) {
        console.error('Upload prescription error:', error);
        throw new AppError('Failed to upload prescription', 500);
    }
};

// Process prescription with AI
exports.processPrescription = async (medicationId) => {
    try {
        const medication = await Medication.findById(medicationId);
        if (!medication) {
            throw new AppError('Medication not found', 404);
        }

        // Update status to processing
        medication.aiParsingStatus = 'processing';
        await medication.save();

        // Use AI to parse prescription
        // In a real implementation, we would extract text from the image first
        // Here, we'll simulate it with a simplified approach
        const prescriptionText = `Medication prescription for patient #${medication.patientId}:
1. Amoxicillin 500mg, Take 1 capsule three times daily for 7 days
2. Ibuprofen 400mg, Take 1 tablet every 6 hours as needed for pain
3. Vitamin D3 1000IU, Take 1 tablet daily`;

        const parsedResult = await aiService.parsePrescription(prescriptionText);

        // Update medication with parsed data
        const medications = parsedResult.medications.map(med => {
            // Generate schedule based on frequency
            const schedule = generateMedicationSchedule(med);

            return {
                name: med.name,
                dosage: med.dosage || '',
                frequency: med.frequency || '',
                startDate: med.startDate || new Date(),
                endDate: med.endDate || null,
                instructions: med.instructions || '',
                schedule
            };
        });

        medication.medications = medications;
        medication.aiParsingStatus = 'completed';

        // Generate reminders
        medication.reminders = generateReminders(medications);

        await medication.save();

        // Schedule reminders
        await scheduleReminders(medication);

        // Create notification that prescription was parsed
        await notificationService.createPrescriptionParsedNotification(medication);

        // Sync with calendar if patient has calendar connected
        const patient = await Patient.findById(medication.patientId);
        if (patient.calendarConnected) {
            try {
                const calendarSyncId = await calendarService.syncMedicationToCalendar(
                    medication.patientId,
                    medication._id
                );

                if (calendarSyncId) {
                    medication.calendarSyncId = calendarSyncId;
                    await medication.save();
                }
            } catch (calendarError) {
                console.error('Calendar sync error:', calendarError);
                // Continue even if calendar sync fails
            }
        }

        return medication;
    } catch (error) {
        console.error('Process prescription error:', error);

        // Update status to failed
        const medication = await Medication.findById(medicationId);
        if (medication) {
            medication.aiParsingStatus = 'failed';
            await medication.save();
        }

        throw new AppError('Failed to process prescription', 500);
    }
};

// Get medication details
exports.getMedication = async (medicationId, userId, role) => {
    try {
        // Get medication with populated fields
        const medication = await Medication.findById(medicationId)
            .populate('patientId', 'name')
            .populate('prescribedBy', 'name');

        if (!medication) {
            throw new AppError('Medication not found', 404);
        }

        // Check authorization
        if (
            (role === 'patient' && medication.patientId._id.toString() !== userId.toString()) &&
            (role === 'doctor' && medication.prescribedBy?.toString() !== userId.toString())
        ) {
            throw new AppError('Not authorized to access this medication', 403);
        }

        return medication;
    } catch (error) {
        console.error('Get medication error:', error);
        throw new AppError('Failed to get medication details', 500);
    }
};

// Update medication details
exports.updateMedication = async (medicationId, updateData, userId, role) => {
    try {
        // Get medication
        const medication = await Medication.findById(medicationId);
        if (!medication) {
            throw new AppError('Medication not found', 404);
        }

        // Check authorization
        if (
            (role === 'patient' && medication.patientId.toString() !== userId.toString()) &&
            (role === 'doctor' && medication.prescribedBy?.toString() !== userId.toString())
        ) {
            throw new AppError('Not authorized to update this medication', 403);
        }

        // Update medications array if provided
        if (updateData.medications && Array.isArray(updateData.medications)) {
            // For each updated medication, regenerate schedule if frequency changed
            updateData.medications.forEach((updatedMed, index) => {
                if (index < medication.medications.length) {
                    const originalMed = medication.medications[index];

                    // If frequency changed, regenerate schedule
                    if (updatedMed.frequency && updatedMed.frequency !== originalMed.frequency) {
                        updatedMed.schedule = generateMedicationSchedule(updatedMed);
                    } else {
                        // Keep existing schedule
                        updatedMed.schedule = originalMed.schedule;
                    }
                }
            });

            medication.medications = updateData.medications;

            // Regenerate reminders
            medication.reminders = generateReminders(medication.medications);

            // Reschedule reminders
            await unscheduleReminders(medication);
            await scheduleReminders(medication);

            // If calendar sync exists, update calendar
            if (medication.calendarSyncId) {
                const patient = await Patient.findById(medication.patientId);
                if (patient.calendarConnected) {
                    try {
                        await calendarService.updateMedicationCalendar(
                            medication.patientId,
                            medication.calendarSyncId,
                            medication
                        );
                    } catch (calendarError) {
                        console.error('Calendar update error:', calendarError);
                        // Continue even if calendar update fails
                    }
                }
            }
        }

        await medication.save();

        return medication;
    } catch (error) {
        console.error('Update medication error:', error);
        throw new AppError('Failed to update medication details', 500);
    }
};

// Mark medication as taken
exports.markMedicationTaken = async (medicationId, medicationIndex, scheduleIndex, patientId, takenAt = null) => {
    try {
        // Get medication
        const medication = await Medication.findById(medicationId);
        if (!medication) {
            throw new AppError('Medication not found', 404);
        }

        // Check authorization
        if (medication.patientId.toString() !== patientId.toString()) {
            throw new AppError('Not authorized to update this medication', 403);
        }

        // Check if medication index is valid
        if (medicationIndex < 0 || medicationIndex >= medication.medications.length) {
            throw new AppError('Invalid medication index', 400);
        }

        const med = medication.medications[medicationIndex];

        // Check if schedule index is valid
        if (scheduleIndex < 0 || scheduleIndex >= med.schedule.length) {
            throw new AppError('Invalid schedule index', 400);
        }

        // Mark as taken
        med.schedule[scheduleIndex].taken = true;
        med.schedule[scheduleIndex].takenAt = takenAt || new Date();

        // Update streak count for gamification
        const patient = await Patient.findById(patientId);
        if (patient && patient.gamification) {
            // Increment streak if medication taken on time
            const scheduledTime = getTodayWithTime(med.schedule[scheduleIndex].time);
            const takenTime = med.schedule[scheduleIndex].takenAt;

            // If taken within 30 minutes of scheduled time, consider it on time
            const timeDiff = Math.abs(takenTime - scheduledTime) / (1000 * 60);
            if (timeDiff <= 30) {
                patient.gamification.streaks.medication++;
                patient.gamification.points += 10;

                // Check for badges based on streak
                if (patient.gamification.streaks.medication === 7) {
                    if (!patient.gamification.badges.includes('week_streak')) {
                        patient.gamification.badges.push('week_streak');
                        patient.gamification.points += 50;

                        // Create notification for badge earned
                        await notificationService.createBadgeEarnedNotification(patient, 'week_streak');
                    }
                } else if (patient.gamification.streaks.medication === 30) {
                    if (!patient.gamification.badges.includes('month_streak')) {
                        patient.gamification.badges.push('month_streak');
                        patient.gamification.points += 100;

                        // Create notification for badge earned
                        await notificationService.createBadgeEarnedNotification(patient, 'month_streak');
                    }
                }

                await patient.save();
            } else {
                // Reset streak if medication taken too late
                patient.gamification.streaks.medication = 0;
                await patient.save();
            }
        }

        // Update reminder status
        const relevantReminder = medication.reminders.find(
            r => r.medicationIndex === medicationIndex && r.time === med.schedule[scheduleIndex].time
        );

        if (relevantReminder) {
            relevantReminder.status = 'acknowledged';
            relevantReminder.acknowledgedAt = new Date();
        }

        // Calculate adherence rate
        updateAdherenceRate(medication);

        await medication.save();

        return medication;
    } catch (error) {
        console.error('Mark medication taken error:', error);
        throw new AppError('Failed to mark medication as taken', 500);
    }
};

// Get upcoming medication schedules
exports.getUpcomingMedications = async (patientId, days = 1) => {
    try {
        // Get all active medications for patient
        const medications = await Medication.find({
            patientId,
            'medications.endDate': { $gte: new Date() }
        });

        const today = new Date();
        const endDate = new Date();
        endDate.setDate(today.getDate() + days);

        const upcoming = [];

        medications.forEach(medication => {
            medication.medications.forEach((med, medIndex) => {
                // Skip if medication has ended
                if (med.endDate && med.endDate < today) {
                    return;
                }

                med.schedule.forEach(scheduleItem => {
                    // Get scheduled time
                    for (let day = 0; day < days; day++) {
                        const scheduleDate = new Date();
                        scheduleDate.setDate(today.getDate() + day);
                        const scheduledTime = getTodayWithTime(scheduleItem.time, scheduleDate);

                        // Skip if time is in the past
                        if (scheduledTime < today) {
                            continue;
                        }

                        // Skip if already taken
                        if (scheduleItem.taken) {
                            continue;
                        }

                        upcoming.push({
                            medicationId: medication._id,
                            medicationIndex: medIndex,
                            name: med.name,
                            dosage: med.dosage,
                            instructions: med.instructions,
                            scheduledTime: scheduledTime,
                            time: scheduleItem.time
                        });
                    }
                });
            });
        });

        // Sort by scheduled time
        upcoming.sort((a, b) => a.scheduledTime - b.scheduledTime);

        return upcoming;
    } catch (error) {
        console.error('Get upcoming medications error:', error);
        throw new AppError('Failed to get upcoming medications', 500);
    }
};

// Get all medications for a patient
exports.getPatientMedications = async (patientId, includeExpired = false) => {
    try {
        const query = { patientId };

        // Exclude expired medications unless includeExpired is true
        if (!includeExpired) {
            const today = new Date();
            query.$or = [
                { 'medications.endDate': null },
                { 'medications.endDate': { $gte: today } }
            ];
        }

        const medications = await Medication.find(query)
            .populate('prescribedBy', 'name')
            .sort({ createdAt: -1 });

        return medications;
    } catch (error) {
        console.error('Get patient medications error:', error);
        throw new AppError('Failed to get patient medications', 500);
    }
};

// Helper functions
function generateMedicationSchedule(medication) {
    const schedule = [];

    // Default to once daily at 8am if frequency not specified
    if (!medication.frequency) {
        schedule.push({
            time: '08:00',
            taken: false
        });
        return schedule;
    }

    // Parse frequency text to generate times
    const frequencyLower = medication.frequency.toLowerCase();

    if (frequencyLower.includes('once daily') || frequencyLower.includes('once a day') || frequencyLower.includes('daily')) {
        if (frequencyLower.includes('morning')) {
            schedule.push({ time: '08:00', taken: false });
        } else if (frequencyLower.includes('evening') || frequencyLower.includes('night')) {
            schedule.push({ time: '20:00', taken: false });
        } else if (frequencyLower.includes('afternoon')) {
            schedule.push({ time: '14:00', taken: false });
        } else if (frequencyLower.includes('before bed') || frequencyLower.includes('bedtime')) {
            schedule.push({ time: '22:00', taken: false });
        } else {
            schedule.push({ time: '08:00', taken: false });
        }
    } else if (frequencyLower.includes('twice daily') || frequencyLower.includes('twice a day') || frequencyLower.includes('bid')) {
        schedule.push({ time: '08:00', taken: false });
        schedule.push({ time: '20:00', taken: false });
    } else if (frequencyLower.includes('three times') || frequencyLower.includes('thrice') || frequencyLower.includes('tid')) {
        schedule.push({ time: '08:00', taken: false });
        schedule.push({ time: '14:00', taken: false });
        schedule.push({ time: '20:00', taken: false });
    } else if (frequencyLower.includes('four times') || frequencyLower.includes('qid')) {
        schedule.push({ time: '08:00', taken: false });
        schedule.push({ time: '12:00', taken: false });
        schedule.push({ time: '16:00', taken: false });
        schedule.push({ time: '20:00', taken: false });
    } else if (frequencyLower.includes('every 4 hours')) {
        schedule.push({ time: '08:00', taken: false });
        schedule.push({ time: '12:00', taken: false });
        schedule.push({ time: '16:00', taken: false });
        schedule.push({ time: '20:00', taken: false });
        schedule.push({ time: '00:00', taken: false });
        schedule.push({ time: '04:00', taken: false });
    } else if (frequencyLower.includes('every 6 hours')) {
        schedule.push({ time: '06:00', taken: false });
        schedule.push({ time: '12:00', taken: false });
        schedule.push({ time: '18:00', taken: false });
        schedule.push({ time: '00:00', taken: false });
    } else if (frequencyLower.includes('every 8 hours')) {
        schedule.push({ time: '08:00', taken: false });
        schedule.push({ time: '16:00', taken: false });
        schedule.push({ time: '00:00', taken: false });
    } else if (frequencyLower.includes('every 12 hours')) {
        schedule.push({ time: '08:00', taken: false });
        schedule.push({ time: '20:00', taken: false });
    } else {
        // Default to once daily
        schedule.push({ time: '08:00', taken: false });
    }

    return schedule;
}

function generateReminders(medications) {
    const reminders = [];

    medications.forEach((med, index) => {
        med.schedule.forEach(scheduleItem => {
            reminders.push({
                medicationIndex: index,
                time: scheduleItem.time,
                status: 'pending'
            });
        });
    });

    return reminders;
}

async function scheduleReminders(medication) {
    medication.reminders.forEach(reminder => {
        // Skip already sent reminders
        if (reminder.status !== 'pending') {
            return;
        }

        const med = medication.medications[reminder.medicationIndex];

        // Create job ID
        const jobId = `med_${medication._id}_${reminder.medicationIndex}_${reminder.time}`;

        // Schedule job
        const job = schedule.scheduleJob(jobId, getTodayWithTime(reminder.time), async () => {
            try {
                // Send notification
                await notificationService.createMedicationReminderNotification(
                    medication,
                    med,
                    reminder.medicationIndex,
                    reminder.time
                );

                // Update reminder status
                await Medication.updateOne(
                    {
                        _id: medication._id,
                        'reminders.medicationIndex': reminder.medicationIndex,
                        'reminders.time': reminder.time
                    },
                    {
                        $set: {
                            'reminders.$.status': 'sent',
                            'reminders.$.sentAt': new Date()
                        }
                    }
                );
            } catch (error) {
                console.error('Medication reminder error:', error);
            }
        });
    });
}

async function unscheduleReminders(medication) {
    medication.reminders.forEach(reminder => {
        const jobId = `med_${medication._id}_${reminder.medicationIndex}_${reminder.time}`;
        const job = schedule.scheduledJobs[jobId];
        if (job) {
            job.cancel();
        }
    });
}

function getTodayWithTime(timeString, baseDate = new Date()) {
    const [hours, minutes] = timeString.split(':').map(num => parseInt(num, 10));
    const date = new Date(baseDate);
    date.setHours(hours, minutes, 0, 0);
    return date;
}

function updateAdherenceRate(medication) {
    let totalDoses = 0;
    let takenDoses = 0;

    medication.medications.forEach(med => {
        med.schedule.forEach(scheduleItem => {
            totalDoses++;
            if (scheduleItem.taken) {
                takenDoses++;
            }
        });
    });

    if (totalDoses > 0) {
        medication.adherenceRate = (takenDoses / totalDoses) * 100;
    } else {
        medication.adherenceRate = 100;
    }
}