// backend/src/controllers/ownerController.js
const db = require('../configs/db');
const { logAction } = require('../utils/auditLogger');

// GET ALL ACTIVE OWNERS
exports.getAllOwners = async (req, res) => {
    try {
        const query = `SELECT id, owner_name, owner_type, status FROM owner WHERE is_deleted = false ORDER BY owner_name ASC`;
        const result = await db.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(' Get All Owners Error:', error);
        res.status(500).json({ message: 'Server error fetching owners.' });
    }
};

// GET OWNER BY ID
exports.getOwnerById = async (req, res) => {
    try {
        const query = `SELECT id, owner_name, owner_type, status FROM owner WHERE id = $1 AND is_deleted = false`;
        const result = await db.query(query, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Owner profile not found.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(' Get Owner By ID Error:', error);
        res.status(500).json({ message: 'Server error fetching owner profile.' });
    }
};

// CREATE OWNER (Admin Only)
exports.createOwner = async (req, res) => {
    const { ownerName, ownerType } = req.body;
    try {
        const query = `INSERT INTO owner (owner_name, owner_type) VALUES ($1, $2) RETURNING *`;
        const result = await db.query(query, [ownerName, ownerType]);
        const newOwner = result.rows[0];

        await logAction({
            userId: req.user.userId,
            action: 'CREATE_OWNER',
            entityName: 'owner',
            entityId: newOwner.id,
            newValue: { owner_name: ownerName, owner_type: ownerType, status: 'ACTIVE' }
        });

        res.status(201).json({ message: 'Owner created successfully', owner: newOwner });
    } catch (error) {
        console.error(' Create Owner Error:', error);
        res.status(500).json({ message: 'Server error creating owner profiles.' });
    }
};

// UPDATE OWNER (Admin Only)
exports.updateOwner = async (req, res) => {
    const { ownerName, ownerType } = req.body;
    const ownerId = req.params.id;
    try {
        const snapshot = await db.query('SELECT owner_name, owner_type FROM owner WHERE id = $1', [ownerId]);
        if (snapshot.rows.length === 0) return res.status(404).json({ message: 'Owner record not found.' });

        const query = `UPDATE owner SET owner_name = $1, owner_type = $2, updated_at = NOW() WHERE id = $3 RETURNING *`;
        const result = await db.query(query, [ownerName, ownerType, ownerId]);

        await logAction({
            userId: req.user.userId,
            action: 'UPDATE_OWNER',
            entityName: 'owner',
            entityId: ownerId,
            oldValue: snapshot.rows[0],
            newValue: { owner_name: ownerName, owner_type: ownerType }
        });

        res.status(200).json({ message: 'Owner record updated successfully', owner: result.rows[0] });
    } catch (error) {
        console.error(' Update Owner Error:', error);
        res.status(500).json({ message: 'Server error updating owner profile.' });
    }
};

// PATCH STATUS (Admin Only - Dynamic Toggle)
exports.updateOwnerStatus = async (req, res) => {
    const { status } = req.body;
    const ownerId = req.params.id;

    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status state configuration.' });
    }

    try {
        const query = `UPDATE owner SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`;
        const result = await db.query(query, [status, ownerId]);

        if (result.rows.length === 0) return res.status(404).json({ message: 'Owner record not found.' });

        await logAction({
            userId: req.user.userId,
            action: 'TOGGLE_OWNER_STATUS',
            entityName: 'owner',
            entityId: ownerId,
            newValue: { status }
        });

        res.status(200).json({ message: `Owner status updated to ${status} safely.`, owner: result.rows[0] });
    } catch (error) {
        console.error(' Owner Status Patch Error:', error);
        res.status(500).json({ message: 'Server error changing owner status flags.' });
    }
};