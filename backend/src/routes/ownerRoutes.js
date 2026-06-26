const express = require('express');
const router = express.Router();
const ownerController = require('../controllers/ownerController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');
const { body, validationResult } = require('express-validator');

const validateOwner = [
    body('ownerName').trim().notEmpty().withMessage('Owner name is required.'),
    body('ownerType').trim().notEmpty().withMessage('Owner type configuration descriptor is required.'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        next();
    }
];

// Read lookups are restricted to authenticated platform users
router.get('/owners', authenticateToken, ownerController.getAllOwners);
router.get('/owners/:id', authenticateToken, ownerController.getOwnerById);

// Write/Modify routines restricted to ADMIN profiles
router.post('/owners', authenticateToken, authorizeRoles('ADMIN'), validateOwner, ownerController.createOwner);
router.put('/owners/:id', authenticateToken, authorizeRoles('ADMIN'), validateOwner, ownerController.updateOwner);
router.patch('/owners/:id/status', authenticateToken, authorizeRoles('ADMIN'), ownerController.updateOwnerStatus);

module.exports = router;