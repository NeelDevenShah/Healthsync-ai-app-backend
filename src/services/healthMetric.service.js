const HealthMetric = require('../models/healthMetric.model');
const Patient = require('../models/patient.model');
const aiService = require('./ai.service');
const notificationService = require('./notification.service');
const { AppError } = require('../middleware/error.middleware');

// Record new health metric
exports.recordHealthMetric = async (patientId, metricData) => {
    try {
        // Create new health metric
        const healthMetric = new HealthMetric({
            patientId,
            type: metricData.type,
            value: metricData.value,
            unit: metricData.unit,
            timestamp: metricData.timestamp || new Date(),
            source: metricData.source || 'manual',
            deviceInfo: metricData.deviceInfo || {},
            notes: metricData.notes || ''
        });

        await healthMetric.save();

        // Get previous readings for context
        const previousReadings = await HealthMetric.find({
            patientId,
            type: metricData.type
        })
            .sort({ timestamp: -1 })
            .limit(5);

        // Get patient history for context
        const patient = await Patient.findById(patientId);
        const patientHistory = formatPatientHistory(patient);

        // Analyze metric with AI
        const analysis = await aiService.analyzeHealthMetrics(
            metricData.type,
            metricData.value,
            patientHistory,
            previousReadings
        );

        // Update metric with analysis result
        healthMetric.isAbnormal = analysis.isAbnormal;

        if (analysis.isAbnormal) {
            healthMetric.abnormalityDetails = {
                severity: analysis.severity,
                description: analysis.analysis
            };

            // Send notification for abnormal reading
            healthMetric.notificationSent = true;
            healthMetric.notificationSentAt = new Date();

            await healthMetric.save();

            // Create notification based on severity
            await notificationService.createHealthAlertNotification(healthMetric);
        } else {
            await healthMetric.save();
        }

        return {
            healthMetric,
            analysis: analysis.analysis
        };
    } catch (error) {
        console.error('Record health metric error:', error);
        throw new AppError('Failed to record health metric', 500);
    }
};

// Get health metrics for a patient
exports.getHealthMetrics = async (patientId, filters = {}) => {
    try {
        const query = { patientId };

        // Apply type filter if provided
        if (filters.type) {
            query.type = filters.type;
        }

        // Apply date range filter if provided
        if (filters.startDate && filters.endDate) {
            query.timestamp = {
                $gte: new Date(filters.startDate),
                $lte: new Date(filters.endDate)
            };
        }

        // Apply abnormality filter if provided
        if (filters.isAbnormal !== undefined) {
            query.isAbnormal = filters.isAbnormal;
        }

        // Apply source filter if provided
        if (filters.source) {
            query.source = filters.source;
        }

        const metrics = await HealthMetric.find(query)
            .sort({ timestamp: -1 })
            .limit(filters.limit ? parseInt(filters.limit, 10) : 100);

        return metrics;
    } catch (error) {
        console.error('Get health metrics error:', error);
        throw new AppError('Failed to get health metrics', 500);
    }
};

// Get dashboard data for health metrics
exports.getDashboardData = async (patientId, timeframe = '7d') => {
    try {
        // Calculate start date based on timeframe
        const endDate = new Date();
        let startDate = new Date();

        switch (timeframe) {
            case '1d':
                startDate.setDate(endDate.getDate() - 1);
                break;
            case '7d':
                startDate.setDate(endDate.getDate() - 7);
                break;
            case '1m':
                startDate.setMonth(endDate.getMonth() - 1);
                break;
            case '3m':
                startDate.setMonth(endDate.getMonth() - 3);
                break;
            case '6m':
                startDate.setMonth(endDate.getMonth() - 6);
                break;
            case '1y':
                startDate.setFullYear(endDate.getFullYear() - 1);
                break;
            default:
                startDate.setDate(endDate.getDate() - 7);
        }

        // Get metrics for each type
        const metricTypes = ['heart_rate', 'blood_pressure', 'glucose', 'weight', 'oxygen', 'temperature'];

        const dashboardData = {};

        // Process each metric type
        for (const type of metricTypes) {
            const metrics = await HealthMetric.find({
                patientId,
                type,
                timestamp: { $gte: startDate, $lte: endDate }
            })
                .sort({ timestamp: 1 });

            if (metrics.length > 0) {
                // Calculate statistics
                let sum = 0;
                let min = Infinity;
                let max = -Infinity;

                // For blood pressure, handle it differently
                if (type === 'blood_pressure') {
                    const systolicValues = metrics.map(m => m.value.systolic);
                    const diastolicValues = metrics.map(m => m.value.diastolic);

                    dashboardData[type] = {
                        data: metrics.map(m => ({
                            timestamp: m.timestamp,
                            value: m.value
                        })),
                        systolic: {
                            average: calculateAverage(systolicValues),
                            min: Math.min(...systolicValues),
                            max: Math.max(...systolicValues),
                            trend: calculateTrend(metrics.map(m => ({
                                timestamp: m.timestamp,
                                value: m.value.systolic
                            })))
                        },
                        diastolic: {
                            average: calculateAverage(diastolicValues),
                            min: Math.min(...diastolicValues),
                            max: Math.max(...diastolicValues),
                            trend: calculateTrend(metrics.map(m => ({
                                timestamp: m.timestamp,
                                value: m.value.diastolic
                            })))
                        },
                        unit: metrics[0].unit,
                        count: metrics.length,
                        abnormalCount: metrics.filter(m => m.isAbnormal).length
                    };
                } else {
                    // For other metrics with simple numeric values
                    const values = metrics.map(m => {
                        const val = typeof m.value === 'object' ? m.value.value : m.value;
                        sum += val;
                        min = Math.min(min, val);
                        max = Math.max(max, val);
                        return val;
                    });

                    dashboardData[type] = {
                        data: metrics.map(m => ({
                            timestamp: m.timestamp,
                            value: typeof m.value === 'object' ? m.value.value : m.value
                        })),
                        average: calculateAverage(values),
                        min,
                        max,
                        trend: calculateTrend(metrics.map(m => ({
                            timestamp: m.timestamp,
                            value: typeof m.value === 'object' ? m.value.value : m.value
                        }))),
                        unit: metrics[0].unit,
                        count: metrics.length,
                        abnormalCount: metrics.filter(m => m.isAbnormal).length
                    };
                }
            }
        }

        return dashboardData;
    } catch (error) {
        console.error('Get dashboard data error:', error);
        throw new AppError('Failed to get dashboard data', 500);
    }
};

// Get abnormal health readings
exports.getAbnormalReadings = async (patientId, timeframe = '7d') => {
    try {
        // Calculate start date based on timeframe
        const endDate = new Date();
        let startDate = new Date();

        switch (timeframe) {
            case '1d':
                startDate.setDate(endDate.getDate() - 1);
                break;
            case '7d':
                startDate.setDate(endDate.getDate() - 7);
                break;
            case '1m':
                startDate.setMonth(endDate.getMonth() - 1);
                break;
            case '3m':
                startDate.setMonth(endDate.getMonth() - 3);
                break;
            case '6m':
                startDate.setMonth(endDate.getMonth() - 6);
                break;
            case '1y':
                startDate.setFullYear(endDate.getFullYear() - 1);
                break;
            default:
                startDate.setDate(endDate.getDate() - 7);
        }

        // Get abnormal readings
        const abnormalReadings = await HealthMetric.find({
            patientId,
            isAbnormal: true,
            timestamp: { $gte: startDate, $lte: endDate }
        })
            .sort({ timestamp: -1 });

        return abnormalReadings;
    } catch (error) {
        console.error('Get abnormal readings error:', error);
        throw new AppError('Failed to get abnormal readings', 500);
    }
};

// Generate personalized health recommendations
exports.generateRecommendations = async (patientId) => {
    try {
        // Get patient data
        const patient = await Patient.findById(patientId);
        if (!patient) {
            throw new AppError('Patient not found', 404);
        }

        // Get recent health metrics
        const recentMetrics = {};
        const metricTypes = ['heart_rate', 'blood_pressure', 'glucose', 'weight', 'oxygen', 'temperature'];

        for (const type of metricTypes) {
            const metric = await HealthMetric.findOne({ patientId, type })
                .sort({ timestamp: -1 });

            if (metric) {
                recentMetrics[type] = {
                    value: metric.value,
                    unit: metric.unit,
                    timestamp: metric.timestamp,
                    isAbnormal: metric.isAbnormal
                };
            }
        }

        // Prepare patient data for AI
        const patientData = {
            age: patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : null,
            gender: patient.gender,
            medicalHistory: patient.medicalHistory || [],
            allergies: patient.allergies || [],
            healthMetrics: {
                ...patient.healthMetrics,
                recentMetrics
            }
        };

        // Generate recommendations
        const recommendations = await aiService.generateHealthRecommendations(patientData);

        return {
            patientData,
            recommendations
        };
    } catch (error) {
        console.error('Generate recommendations error:', error);
        throw new AppError('Failed to generate health recommendations', 500);
    }
};

// Helper functions
function formatPatientHistory(patient) {
    if (!patient) return '';

    let history = '';

    // Add basic info
    if (patient.dateOfBirth) {
        const age = calculateAge(patient.dateOfBirth);
        history += `Age: ${age} years. `;
    }

    if (patient.gender) {
        history += `Gender: ${patient.gender}. `;
    }

    // Add medical conditions
    if (patient.medicalHistory && patient.medicalHistory.length > 0) {
        history += 'Medical conditions: ';
        patient.medicalHistory.forEach((condition, index) => {
            history += condition.condition;
            if (index < patient.medicalHistory.length - 1) {
                history += ', ';
            }
        });
        history += '. ';
    }

    // Add allergies
    if (patient.allergies && patient.allergies.length > 0) {
        history += 'Allergies: ';
        patient.allergies.forEach((allergy, index) => {
            history += allergy;
            if (index < patient.allergies.length - 1) {
                history += ', ';
            }
        });
        history += '. ';
    }

    // Add health metrics
    if (patient.healthMetrics) {
        if (patient.healthMetrics.height) {
            history += `Height: ${patient.healthMetrics.height} cm. `;
        }

        if (patient.healthMetrics.weight) {
            history += `Weight: ${patient.healthMetrics.weight} kg. `;
        }

        if (patient.healthMetrics.bloodType) {
            history += `Blood type: ${patient.healthMetrics.bloodType}. `;
        }
    }

    return history;
}

function calculateAge(birthDate) {
    const today = new Date();
    const dob = new Date(birthDate);
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }

    return age;
}

function calculateAverage(values) {
    if (!values || values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
}

function calculateTrend(data) {
    if (!data || data.length < 2) return 'stable';

    // Simple linear regression
    const n = data.length;
    const timestamps = data.map(d => new Date(d.timestamp).getTime());
    const values = data.map(d => d.value);

    // Normalize timestamps to days from first reading
    const firstTimestamp = timestamps[0];
    const normalizedTimestamps = timestamps.map(t => (t - firstTimestamp) / (1000 * 60 * 60 * 24));

    // Calculate slope
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
        sumX += normalizedTimestamps[i];
        sumY += values[i];
        sumXY += normalizedTimestamps[i] * values[i];
        sumX2 += normalizedTimestamps[i] * normalizedTimestamps[i];
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // Determine trend based on slope
    if (Math.abs(slope) < 0.01) {
        return 'stable';
    } else if (slope > 0) {
        return 'increasing';
    } else {
        return 'decreasing';
    }
}