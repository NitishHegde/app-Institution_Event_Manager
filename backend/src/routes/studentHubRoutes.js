// backend/src/routes/studentHubRoutes.js
const express = require('express');
const router = express.Router();
const studentHubController = require('../controllers/studentHubController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

// Student-Facing Context Enclaves
router.get('/students/me/participations', authenticateToken, authorizeRoles('STUDENT'), studentHubController.getMyParticipations);
router.get('/students/me/accomplishments', authenticateToken, authorizeRoles('STUDENT'), studentHubController.getMyAccomplishments);
router.get('/students/me/star-rating', authenticateToken, authorizeRoles('STUDENT'), studentHubController.getMyStarRating);
router.get('/students/me/profile', authenticateToken, authorizeRoles('STUDENT'), studentHubController.getMyProfile);
router.put('/students/me/profile', authenticateToken, authorizeRoles('STUDENT'), studentHubController.updateMyProfile);

// Staff-Facing Review Enclaves
router.get('/students/search', authenticateToken, authorizeRoles('STAFF', 'ADMIN', 'STUDENT'), studentHubController.searchStudents);
router.get('/students/:studentId', authenticateToken, authorizeRoles('STAFF', 'ADMIN'), studentHubController.getStudentDetailsById);

module.exports = router;