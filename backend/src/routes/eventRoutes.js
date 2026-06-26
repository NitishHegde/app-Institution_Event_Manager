// backend/src/routes/eventRoutes.js
const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');
const { requireEventOwner } = require('../middlewares/eventAuthMiddleware');
const { body, validationResult } = require('express-validator');

// Validation Array for Event Creation
const validateEventCreation = [
    body('eventName').trim().notEmpty().withMessage('Event primary title name indicator is mandatory.'),
    body('eventSeriesId').isUUID().withMessage('Valid parent context event series pointer reference must be mapped.'),
    body('ownerId').isUUID().withMessage('Responsible management framework owner indicator required.'),
    body('eventCategoryId').isUUID().withMessage('Target operational categorization tracking identifier missing.'),
    body('participationType').isIn(['INDIVIDUAL', 'GROUP']).withMessage('Invalid format classification strategy configuration choice.'),

    // Conditional Rule Guard: Enforces clean data blocks for Individual vs Group entries
    body().custom((value) => {
        if (value.participationType === 'INDIVIDUAL') {
            if (value.minTeamSize || value.maxTeamSize) {
                throw new Error('Data Conflict: Individual participation events cannot contain team size parameters.');
            }
        }
        if (value.participationType === 'GROUP') {
            if (!value.minTeamSize || !value.maxTeamSize) {
                throw new Error('Group events must specify minimum and maximum team sizes.');
            }
            if (parseInt(value.minTeamSize) > parseInt(value.maxTeamSize)) {
                throw new Error('Minimum team size cannot be greater than maximum team size.');
            }
        }
        return true;
    }),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        next();
    }
];

// =====================================================
// EVENT ROUTES
// =====================================================

// 1. Create Event (Accessible by Admin and Staff)
router.post('/events', authenticateToken, authorizeRoles('ADMIN', 'STAFF'), validateEventCreation, eventController.createEvent);

// 2. Update Event Status (Accessible by Admin and the original Faculty Owner)
router.patch('/events/:eventId/status', authenticateToken, requireEventOwner, eventController.updateEventStatus);


// =====================================================
// COORDINATOR ROUTES 
// =====================================================

// 3. Get Coordinators assigned to an event
router.get('/events/:eventId/coordinators', authenticateToken, eventController.getEventCoordinators);

// 4. Add a coordinator to an event
router.post('/events/:eventId/coordinators', authenticateToken, requireEventOwner, eventController.addCoordinator);

// 5. Delete a coordinator assignment (Uses Option B: /events/coordinators/:id)
router.delete('/events/coordinators/:id', authenticateToken, requireEventOwner, eventController.deleteCoordinator);


// Add these to the bottom of backend/src/routes/eventRoutes.js

// =====================================================
// PUBLIC & HOME DISCOVERY CAROUSEL ROUTES
// =====================================================

// 6. Public Landing Discovery (Unauthenticated - Accessible by everyone)
router.get('/public/events/landing', eventController.getPublicLandingEvents);

// 7. Categorized Home Carousels (Authenticated - Accessible by all logged-in profiles)
router.get('/events/home/categorized', authenticateToken, eventController.getCategorizedHomeEvents);

// 8. Individual Event Deep Detailed Workspace View (Authenticated)
router.get('/events/:eventId/details', authenticateToken, eventController.getSingleEventDetails);

// 9. Stream Uploaded Event Posters (Unauthenticated - Accessible by everyone)
router.get('/public/events/poster/:fileId', eventController.streamEventPoster);

// 10. Staff dashboard created & coordinating events (Authenticated - Staff only)
router.get('/events/staff/dashboard', authenticateToken, authorizeRoles('STAFF'), eventController.getStaffDashboardEvents);

// 11. Modify event details (Authenticated - Staff/Admin)
router.put('/events/:eventId', authenticateToken, authorizeRoles('STAFF', 'ADMIN'), eventController.updateEventDetails);

module.exports = router;