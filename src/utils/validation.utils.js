const { body, param, query, validationResult } = require('express-validator');
const { AppError } = require('../middleware/error.middleware');

// Validate request using express-validator
exports.validate = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map(validation => validation.run(req)));

        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        const extractedErrors = [];
        errors.array().map(err => extractedErrors.push({ [err.param]: err.msg }));

        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: extractedErrors
        });
    };
};

// Common validation rules
exports.authValidation = {
    register: [
        body('email').isEmail().withMessage('Please enter a valid email'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('name.first').notEmpty().withMessage('First name is required'),
        body('name.last').notEmpty().withMessage('Last name is required'),
        body('phone').optional().isMobilePhone().withMessage('Please enter a valid phone number')
    ],
    login: [
        body('email').isEmail().withMessage('Please enter a valid email'),
        body('password').notEmpty().withMessage('Password is required')
    ]
};

exports.diagnosisValidation = {
    create: [
        body('symptomDescription').notEmpty().withMessage('Symptom description is required')
    ],
    message: [
        param('id').isMongoId().withMessage('Invalid diagnosis ID'),
        body('message').notEmpty().withMessage('Message content is required'),
        body('role').isIn(['patient', 'ai']).withMessage('Invalid role')
    ]
};

exports.appointmentValidation = {
    create: [
        body('diagnosisId').isMongoId().withMessage('Invalid diagnosis ID'),
        body('date').isISO8601().toDate().withMessage('Invalid date format'),
        body('time.start').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time should be in HH:MM format'),
        body('time.end').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('End time should be in HH:MM format')
    ],
    update: [
        param('id').isMongoId().withMessage('Invalid appointment ID'),
        body('status').optional().isIn(['scheduled', 'completed', 'cancelled', 'no_show']).withMessage('Invalid status')
    ]
};

exports.reportValidation = {
    upload: [
        body('appointmentId').optional().isMongoId().withMessage('Invalid appointment ID'),
        body('diagnosisId').optional().isMongoId().withMessage('Invalid diagnosis ID'),
        body('type').notEmpty().withMessage('Report type is required'),
        body('name').notEmpty().withMessage('Report name is required')
    ]
};

exports.medicationValidation = {
    create: [
        body('prescribedDate').optional().isISO8601().toDate().withMessage('Invalid date format'),
        body('medications').isArray().withMessage('Medications must be an array'),
        body('medications.*.name').notEmpty().withMessage('Medication name is required'),
        body('medications.*.dosage').optional(),
        body('medications.*.frequency').optional(),
        body('medications.*.startDate').optional().isISO8601().toDate().withMessage('Invalid start date format'),
        body('medications.*.endDate').optional().isISO8601().toDate().withMessage('Invalid end date format')
    ]
};

exports.healthMetricValidation = {
    create: [
        body('type').isIn(['heart_rate', 'blood_pressure', 'glucose', 'temperature', 'oxygen', 'weight', 'other']).withMessage('Invalid metric type'),
        body('value').notEmpty().withMessage('Value is required'),
        body('unit').notEmpty().withMessage('Unit is required'),
        body('timestamp').optional().isISO8601().toDate().withMessage('Invalid timestamp format'),
        body('source').optional().isIn(['manual', 'iot', 'wearable']).withMessage('Invalid source')
    ]
};

exports.notificationValidation = {
    register: [
        body('token').notEmpty().withMessage('Device token is required'),
        body('deviceType').isIn(['android', 'ios', 'web']).withMessage('Invalid device type')
    ]
};

exports.paginationValidation = [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];