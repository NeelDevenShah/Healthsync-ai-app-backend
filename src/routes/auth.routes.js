const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate, authValidation } = require('../utils/validation.utils');

// Public routes
router.post('/register', validate(authValidation.register), authController.registerPatient);
router.post('/login', validate(authValidation.login), authController.loginUser);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes
router.use(authenticate);
router.post('/logout', authController.logoutUser);
router.get('/me', authController.getProfile);
router.put('/me', authController.updateProfile);

module.exports = router;