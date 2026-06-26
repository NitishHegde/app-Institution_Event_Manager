// backend/src/routes/evaluationRoutes.js
const express = require('express');
const router = express.Router();
const evaluationController = require('../controllers/evaluationController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

// GET: Fetch participant list with existing attendance marks
router.get(
    '/events/:eventId/attendance',
    authenticateToken,
    authorizeRoles('ADMIN', 'STAFF'),
    evaluationController.getAttendanceSheet
);

// POST: Bulk submit / update attendance records
router.post(
    '/events/:eventId/attendance',
    authenticateToken,
    authorizeRoles('ADMIN', 'STAFF'),
    evaluationController.submitBulkAttendance
);

// GET: Fetch existing podium results for an event
router.get(
    '/events/:eventId/evaluation/podium',
    authenticateToken,
    authorizeRoles('ADMIN', 'STAFF'),
    evaluationController.getPodiumResults
);

// POST: Publish / update podium position winners
router.post(
    '/events/:eventId/evaluation/podium',
    authenticateToken,
    authorizeRoles('ADMIN', 'STAFF'),
    evaluationController.submitPodiumPositions
);

module.exports = router;