// backend/src/controllers/categoryController.js
const db = require('../configs/db');
const { logAction } = require('../utils/auditLogger');

// GET ALL CATEGORIES
exports.getAllCategories = async (req, res) => {
    try {
        const query = `SELECT id, category_name, category_type, status FROM event_category WHERE is_deleted = false ORDER BY category_name ASC`;
        const result = await db.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(' Get All Categories Error:', error);
        res.status(500).json({ message: 'Server error fetching event categories.' });
    }
};

// GET CATEGORY BY ID
exports.getCategoryById = async (req, res) => {
    try {
        const query = `SELECT id, category_name, category_type, status FROM event_category WHERE id = $1 AND is_deleted = false`;
        const result = await db.query(query, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Event category not found.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Get Category By ID Error:', error);
        res.status(500).json({ message: 'Server error fetching event category.' });
    }
};

// CREATE CATEGORY (Admin Only)
exports.createCategory = async (req, res) => {
    const { categoryName, categoryType } = req.body;
    try {
        const query = `INSERT INTO event_category (category_name, category_type) VALUES ($1, $2) RETURNING *`;
        const result = await db.query(query, [categoryName, categoryType]);
        const newCategory = result.rows[0];

        await logAction({
            userId: req.user.userId,
            action: 'CREATE_EVENT_CATEGORY',
            entityName: 'event_category',
            entityId: newCategory.id,
            newValue: { category_name: categoryName, category_type: categoryType, status: 'ACTIVE' }
        });

        res.status(201).json({ message: 'Event category created successfully', category: newCategory });
    } catch (error) {
        console.error('Create Category Error:', error);
        res.status(500).json({ message: 'Server error creating event category.' });
    }
};

// UPDATE CATEGORY (Admin Only)
exports.updateCategory = async (req, res) => {
    const { categoryName, categoryType } = req.body;
    const categoryId = req.params.id;
    try {
        const snapshot = await db.query('SELECT category_name, category_type FROM event_category WHERE id = $1', [categoryId]);
        if (snapshot.rows.length === 0) return res.status(404).json({ message: 'Event category not found.' });

        const query = `UPDATE event_category SET category_name = $1, category_type = $2, updated_at = NOW() WHERE id = $3 RETURNING *`;
        const result = await db.query(query, [categoryName, categoryType, categoryId]);

        await logAction({
            userId: req.user.userId,
            action: 'UPDATE_EVENT_CATEGORY',
            entityName: 'event_category',
            entityId: categoryId,
            oldValue: snapshot.rows[0],
            newValue: { category_name: categoryName, category_type: categoryType }
        });

        res.status(200).json({ message: 'Event category updated successfully', category: result.rows[0] });
    } catch (error) {
        console.error('Update Category Error:', error);
        res.status(500).json({ message: 'Server error updating event category.' });
    }
};

// PATCH STATUS (Admin Only - Dynamic Toggle)
exports.updateCategoryStatus = async (req, res) => {
    const { status } = req.body;
    const categoryId = req.params.id;

    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status state selection.' });
    }

    try {
        const query = `UPDATE event_category SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`;
        const result = await db.query(query, [status, categoryId]);

        if (result.rows.length === 0) return res.status(404).json({ message: 'Event category not found.' });

        await logAction({
            userId: req.user.userId,
            action: 'TOGGLE_CATEGORY_STATUS',
            entityName: 'event_category',
            entityId: categoryId,
            newValue: { status }
        });

        res.status(200).json({ message: `Category status successfully adjusted to ${status}.`, category: result.rows[0] });
    } catch (error) {
        console.error(' Category Status Patch Error:', error);
        res.status(500).json({ message: 'Server error updating category status.' });
    }
};