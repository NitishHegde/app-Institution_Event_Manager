const { body, validationResult } = require('express-validator');

// Helper to intercept validation results and return clean errors
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Returns a 400 Bad Request with an array of descriptive messages
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Rules for Student Registration
const studentRegisterValidator = [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('email').isEmail().withMessage('Must provide a valid email address.').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
    body('registrationId').trim().notEmpty().withMessage('Registration ID is required.'),
    body('schoolId').isUUID().withMessage('Valid School UUID format is required.'),
    validateRequest
];

// Rules for Staff Registration
const staffRegisterValidator = [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('email').isEmail().withMessage('Must provide a valid email address.').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
    validateRequest
];

// Rules for Login
const loginValidator = [
    body('email').isEmail().withMessage('Must provide a valid email address.').normalizeEmail(),
    body('password').notEmpty().withMessage('Password cannot be empty.'),
    validateRequest
];

// password change
const changePasswordValidator = [
    body('oldPassword').notEmpty().withMessage('Current password is required.'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long.'),
    validateRequest
];

module.exports = {
    studentRegisterValidator,
    staffRegisterValidator,
    loginValidator,
    changePasswordValidator
};