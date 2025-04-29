const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { AppError } = require('./error.middleware');
const config = require('../config/config');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../', config.FILE_UPLOAD_PATH);
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Create appropriate subdirectory based on file type
        let subDir = 'misc';

        if (file.mimetype.startsWith('image/')) {
            subDir = 'images';
        } else if (file.mimetype === 'application/pdf') {
            subDir = 'documents';
        } else if (file.mimetype.includes('spreadsheet') || file.mimetype.includes('excel')) {
            subDir = 'reports';
        }

        const destPath = path.join(uploadsDir, subDir);

        // Create subdirectory if it doesn't exist
        if (!fs.existsSync(destPath)) {
            fs.mkdirSync(destPath, { recursive: true });
        }

        cb(null, destPath);
    },
    filename: function (req, file, cb) {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    // Allow specific file types
    const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'application/json'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError(`Unsupported file type ${file.mimetype}`, 400), false);
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: config.MAX_FILE_SIZE // Default: 10MB
    }
});

// Handle multer errors
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new AppError(`File too large. Maximum size is ${config.MAX_FILE_SIZE / (1024 * 1024)}MB`, 400));
        }
        return next(new AppError(`Upload error: ${err.message}`, 400));
    }
    next(err);
};

module.exports = {
    upload,
    handleMulterError
};