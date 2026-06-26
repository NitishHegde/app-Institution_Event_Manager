// backend/src/routes/configRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../configs/db');

// GET /api/schools - Fetch active schools for registration dropdowns [cite: 81, 84]
router.get('/schools', async (req, res) => {
    try {
        const result = await db.query(
            "SELECT id, school_name FROM school WHERE is_deleted = false AND status = 'ACTIVE' ORDER BY school_name ASC"
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching schools:', error);
        res.status(500).json({ message: 'Internal server error fetching configuration data.' });
    }
});

module.exports = router;