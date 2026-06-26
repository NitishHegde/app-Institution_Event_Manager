const express = require('express');
const router = express.Router();
const seriesController = require('../controllers/seriesController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');
const { body, validationResult } = require('express-validator');

const validateSeries = [
    body('seriesName').trim().notEmpty().withMessage('Series identifier name is required.'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        next();
    }
];

// Authenticated view lookups
router.get('/event-series', authenticateToken, seriesController.getAllSeries);
router.get('/event-series/:id', authenticateToken, seriesController.getSeriesById);

// Open creation: Accessible by Admin, Staff, or Student accounts during event setup
router.post(
    '/event-series',
    authenticateToken,
    authorizeRoles('ADMIN', 'STAFF', 'STUDENT'),
    validateSeries,
    seriesController.createSeries
);

// Open update: Handled directly inside the controller to verify relationship context
router.put(
    '/event-series/:id',
    authenticateToken,
    authorizeRoles('ADMIN', 'STAFF', 'STUDENT'),
    validateSeries,
    seriesController.updateSeries
);

// Activation switches remain strictly locked down to ADMIN profiles only
router.patch('/event-series/:id/status', authenticateToken, authorizeRoles('ADMIN'), seriesController.updateSeriesStatus);

module.exports = router;