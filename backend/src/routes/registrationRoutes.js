const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

// Generic execution route (Open strictly to platform STUDENT profiles)
router.post(
    '/events/:eventId/register',
    authenticateToken,
    authorizeRoles('STUDENT'),
    registrationController.registerForEvent
);

module.exports = router;


