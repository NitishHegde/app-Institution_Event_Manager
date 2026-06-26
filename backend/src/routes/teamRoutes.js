// backend/src/routes/teamRoutes.js
const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

// Student Dashboard Path: View pending team invitations
router.get('/teams/invitations/pending', authenticateToken, authorizeRoles('STUDENT'), teamController.getPendingInvitations);

// Student Dashboard Path: View team composition status layouts
router.get('/teams/:teamId', authenticateToken, teamController.getTeamDetails);

// Student Dashboard Path: Respond to team invite (Accept/Reject)
router.patch('/teams/:teamId/members/respond', authenticateToken, authorizeRoles('STUDENT'), teamController.respondToInvitation);

// Faculty/Admin Path: Force change team status manually
router.patch('/teams/:teamId/status', authenticateToken, authorizeRoles('ADMIN', 'STAFF'), teamController.updateTeamStatusOverride);

module.exports = router;