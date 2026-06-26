const express = require('express');
const router = express.Router();
const registrationListController = require('../controllers/registrationListController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

// Dashboard Registration Index Fetch Path (Supports: ?page=1&size=10&search=Beta)
router.get(
    '/events/:eventId/registrations',
    authenticateToken,
    authorizeRoles('ADMIN', 'STAFF', 'STUDENT'),
    registrationListController.getRegistrationList
);

// Spreadsheet Exporter Download Path (Supports: ?format=csv)
router.get(
    '/events/:eventId/registrations/export',
    authenticateToken,
    authorizeRoles('ADMIN', 'STAFF', 'STUDENT'),
    registrationListController.exportRegistrationData
);

module.exports = router;