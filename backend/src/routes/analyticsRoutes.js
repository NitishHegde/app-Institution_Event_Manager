const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken } = require('../middlewares/authMiddleware');

// Route to get a list of past events for the dropdown
router.get('/analytics/events/past', authenticateToken, analyticsController.getPastEventsList);

// Route to get organization-wide stats
router.get('/analytics/organization', authenticateToken, analyticsController.getOrganizationStats);

// Route to get single event stats
router.get('/analytics/events/:eventId/stats', authenticateToken, analyticsController.getEventStats);

module.exports = router;