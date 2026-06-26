// backend/src/controllers/schoolController.js
const db = require('../configs/db');
const { logAction } = require('../utils/auditLogger');

// CREATE SCHOOL (Admin Only)
exports.createSchool = async (req, res) => {
    const { schoolName } = req.body;
    try {
        const query = `INSERT INTO school (school_name) VALUES ($1) RETURNING *`;
        const result = await db.query(query, [schoolName]);
        const newSchool = result.rows[0];

        // Audit Log entry
        await logAction({
            userId: req.user.userId,
            action: 'CREATE_SCHOOL',
            entityName: 'school',
            entityId: newSchool.id,
            newValue: { school_name: schoolName, status: 'ACTIVE' }
        });

        res.status(201).json({ message: 'School created successfully', school: newSchool });
    } catch (error) {
        console.error('Create School Error:', error);
        res.status(500).json({ message: 'Server error creating school.' });
    }
};

// GET SCHOOL BY ID (Public/Protected shared context)
exports.getSchoolById = async (req, res) => {
    try {
        const query = `SELECT id, school_name, status FROM school WHERE id = $1 AND is_deleted = false`;
        const result = await db.query(query, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'School not found.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Get School By ID Error:', error);
        res.status(500).json({ message: 'Server error fetching school.' });
    }
};

// UPDATE SCHOOL (Admin Only)
exports.updateSchool = async (req, res) => {
    const { schoolName } = req.body;
    const schoolId = req.params.id;
    try {
        // Get old data snapshot for the audit history log
        const snapshot = await db.query('SELECT school_name FROM school WHERE id = $1', [schoolId]);
        if (snapshot.rows.length === 0) return res.status(404).json({ message: 'School not found.' });

        const query = `UPDATE school SET school_name = $1, updated_at = NOW() WHERE id = $2 RETURNING *`;
        const result = await db.query(query, [schoolName, schoolId]);

        await logAction({
            userId: req.user.userId,
            action: 'UPDATE_SCHOOL',
            entityName: 'school',
            entityId: schoolId,
            oldValue: snapshot.rows[0],
            newValue: { school_name: schoolName }
        });

        res.status(200).json({ message: 'School updated successfully', school: result.rows[0] });
    } catch (error) {
        console.error('Update School Error:', error);
        res.status(500).json({ message: 'Server error updating school.' });
    }
};

// DISABLE SCHOOL (Admin Only - Setting status = INACTIVE)
exports.disableSchool = async (req, res) => {
    const schoolId = req.params.id;
    try {
        const query = `UPDATE school SET status = 'INACTIVE', updated_at = NOW() WHERE id = $1 RETURNING *`;
        const result = await db.query(query, [schoolId]);

        if (result.rows.length === 0) return res.status(404).json({ message: 'School not found.' });

        await logAction({
            userId: req.user.userId,
            action: 'DISABLE_SCHOOL',
            entityName: 'school',
            entityId: schoolId,
            newValue: { status: 'INACTIVE' }
        });

        res.status(200).json({ message: 'School disabled safely.', school: result.rows[0] });
    } catch (error) {
        console.error('Disable School Error:', error);
        res.status(500).json({ message: 'Server error changing school visibility.' });
    }
};


// ENABLE SCHOOL (Admin Only - Setting status = ACTIVE)
exports.enableSchool = async (req, res) => {
    const schoolId = req.params.id;
    try {
        const query = `UPDATE school SET status = 'ACTIVE', updated_at = NOW() WHERE id = $1 RETURNING *`;
        const result = await db.query(query, [schoolId]);

        if (result.rows.length === 0) return res.status(404).json({ message: 'School not found.' });

        // Track execution within our audit records
        await logAction({
            userId: req.user.userId,
            action: 'ENABLE_SCHOOL',
            entityName: 'school',
            entityId: schoolId,
            newValue: { status: 'ACTIVE' }
        });

        res.status(200).json({ message: 'School enabled successfully.', school: result.rows[0] });
    } catch (error) {
        console.error('Enable School Error:', error);
        res.status(500).json({ message: 'Server error changing school visibility.' });
    }
};