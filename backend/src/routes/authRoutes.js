// backend/src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
// Import your new request validation guards
const {
    studentRegisterValidator,
    staffRegisterValidator,
    loginValidator,
    changePasswordValidator
} = require('../middlewares/validatorMiddleware');
const { authenticateToken } = require('../middlewares/authMiddleware');

// Public Authentication Routes protected by input validation rules
router.post('/register/student', studentRegisterValidator, authController.registerStudent);
router.post('/register/staff', staffRegisterValidator, authController.registerStaff);
router.post('/login', loginValidator, authController.login);

// Protected Authentication Endpoints
router.post('/change-password', authenticateToken, changePasswordValidator, authController.changePassword);
router.post('/logout', authenticateToken, authController.logout);
// Protected User Context Route
router.get('/me', authenticateToken, authController.getMe);
router.get('/staff', authenticateToken, authController.getAllStaff);

// Staff profile routes
router.get('/staff/profile', authenticateToken, authController.getStaffProfile);
router.put('/me/name', authenticateToken, authController.updateMyName);

module.exports = router;