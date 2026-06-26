const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');
const { body, validationResult } = require('express-validator');

const validateCategory = [
    body('categoryName').trim().notEmpty().withMessage('Category name is required.'),
    body('categoryType').trim().notEmpty().withMessage('Category type descriptor is required.'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        next();
    }
];

// Authenticated Read lookups
router.get('/event-categories', authenticateToken, categoryController.getAllCategories);
router.get('/event-categories/:id', authenticateToken, categoryController.getCategoryById);

// Admin-Only writing capabilities
router.post('/event-categories', authenticateToken, authorizeRoles('ADMIN'), validateCategory, categoryController.createCategory);
router.put('/event-categories/:id', authenticateToken, authorizeRoles('ADMIN'), validateCategory, categoryController.updateCategory);
router.patch('/event-categories/:id/status', authenticateToken, authorizeRoles('ADMIN'), categoryController.updateCategoryStatus);

module.exports = router;