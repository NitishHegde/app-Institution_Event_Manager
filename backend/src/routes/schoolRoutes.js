const express = require('express');
const router = express.Router();
const schoolController = require('../controllers/schoolController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');
const { body } = require('express-validator');
const { validationResult } = require('express-validator');

const validateSchool = [
    body('schoolName').trim().notEmpty().withMessage('School name is required.'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        next();
    }
];

// Admin Protected Modification Capabilities
router.post('/schools', authenticateToken, authorizeRoles('ADMIN'), validateSchool, schoolController.createSchool);
router.put('/schools/:id', authenticateToken, authorizeRoles('ADMIN'), validateSchool, schoolController.updateSchool);
router.patch('/schools/:id/disable', authenticateToken, authorizeRoles('ADMIN'), schoolController.disableSchool);
router.patch('/schools/:id/enable', authenticateToken, authorizeRoles('ADMIN'), schoolController.enableSchool);

// protected ID Lookup Route
router.get('/schools/:id', authenticateToken, schoolController.getSchoolById);

module.exports = router;