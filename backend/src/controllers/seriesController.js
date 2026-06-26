// backend/src/controllers/seriesController.js
const db = require('../configs/db');
const { logAction } = require('../utils/auditLogger');

// GET ALL EVENT SERIES (Open to all authenticated users for dropdowns)
exports.getAllSeries = async (req, res) => {
    try {
        const query = `
      SELECT id, series_name, status 
      FROM event_series 
      WHERE is_deleted = false 
      ORDER BY series_name ASC
    `;
        const result = await db.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Get All Series Error:', error);
        res.status(500).json({ message: 'Server error fetching event series lists.' });
    }
};

// GET EVENT SERIES BY ID
exports.getSeriesById = async (req, res) => {
    try {
        const query = `
      SELECT id, series_name, status 
      FROM event_series 
      WHERE id = $1 AND is_deleted = false
    `;
        const result = await db.query(query, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Event series context not found.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(' Get Series By ID Error:', error);
        res.status(500).json({ message: 'Server error retrieving event series.' });
    }
};

// CREATE EVENT SERIES (Accessible by Admin, Staff, and Student Coordinators during creation)
exports.createSeries = async (req, res) => {
    const { seriesName } = req.body;
    const trimmedName = seriesName ? seriesName.trim() : '';

    try {
        // 1. Proactively verify case-insensitively to strictly reject duplicates
        const checkQuery = `
      SELECT id 
      FROM event_series 
      WHERE LOWER(series_name) = LOWER($1) AND is_deleted = false
    `;
        const checkResult = await db.query(checkQuery, [trimmedName]);

        if (checkResult.rows.length > 0) {
            return res.status(400).json({
                message: 'This event series name already exists. Please select it from the dropdown options instead.'
            });
        }

        // 2. Insert if entirely unique
        const query = `
      INSERT INTO event_series (series_name) 
      VALUES ($1) 
      RETURNING id, series_name, status, created_at
    `;
        const result = await db.query(query, [trimmedName]);
        const newSeries = result.rows[0];

        await logAction({
            userId: req.user.userId,
            action: 'CREATE_EVENT_SERIES',
            entityName: 'event_series',
            entityId: newSeries.id,
            newValue: { series_name: trimmedName, status: 'ACTIVE' }
        });

        res.status(201).json({ message: 'Event series established successfully', series: newSeries });
    } catch (error) {
        console.error(' Create Series Error:', error);
        res.status(500).json({ message: 'Server error generating new event series.' });
    }
};

// UPDATE EVENT SERIES (Authorized Admins OR Associated Event Owners/Coordinators)
exports.updateSeries = async (req, res) => {
    const { seriesName } = req.body;
    const trimmedName = seriesName ? seriesName.trim() : '';
    const seriesId = req.params.id;
    const { userId, role } = req.user;

    try {
        // 1. Verify that the series exists
        const snapshot = await db.query('SELECT series_name FROM event_series WHERE id = $1 AND is_deleted = false', [seriesId]);
        if (snapshot.rows.length === 0) {
            return res.status(404).json({ message: 'Event series record not found.' });
        }

        // 2. Check Permissions: Allow if ADMIN globally, otherwise verify event-level relationship
        if (role !== 'ADMIN') {
            const authorizationCheckQuery = `
        SELECT 1 FROM event e
        LEFT JOIN staff_profile sp ON e.created_by_staff_id = sp.id
        LEFT JOIN coordinator_assignment ca ON e.id = ca.event_id AND ca.is_deleted = false
        WHERE e.event_series_id = $1 AND e.is_deleted = false
          AND (sp.user_id = $2 OR ca.user_id = $3)
        LIMIT 1
      `;
            const authResult = await db.query(authorizationCheckQuery, [seriesId, userId, userId]);

            if (authResult.rows.length === 0) {
                return res.status(403).json({
                    message: 'Access Forbidden: You are not authorized to edit this series because you do not manage any events tied to it.'
                });
            }
        }

        // 3. Prevent duplicate names across other distinct series rows
        const duplicateCheck = await db.query(
            'SELECT id FROM event_series WHERE LOWER(series_name) = LOWER($1) AND id <> $2 AND is_deleted = false',
            [trimmedName, seriesId]
        );
        if (duplicateCheck.rows.length > 0) {
            return res.status(400).json({ message: 'Another event series with this name already exists.' });
        }

        // 4. Perform global update across all shared events
        const query = `
      UPDATE event_series 
      SET series_name = $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING id, series_name, status, updated_at
    `;
        const result = await db.query(query, [trimmedName, seriesId]);

        await logAction({
            userId: userId,
            action: 'UPDATE_EVENT_SERIES',
            entityName: 'event_series',
            entityId: seriesId,
            oldValue: snapshot.rows[0],
            newValue: { series_name: trimmedName }
        });

        res.status(200).json({
            message: 'Event series updated successfully. Changes are reflected across all tied events.',
            series: result.rows[0]
        });
    } catch (error) {
        console.error(' Update Series Error:', error);
        res.status(500).json({ message: 'Server error modifying event series record.' });
    }
};

// PATCH STATUS (Admin Only - Only an absolute administrator manages global component activation switches)
exports.updateSeriesStatus = async (req, res) => {
    const { status } = req.body;
    const seriesId = req.params.id;

    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status parameter context.' });
    }

    try {
        const query = `
      UPDATE event_series 
      SET status = $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING id, series_name, status, updated_at
    `;
        const result = await db.query(query, [status, seriesId]);

        if (result.rows.length === 0) return res.status(404).json({ message: 'Event series record not found.' });

        await logAction({
            userId: req.user.userId,
            action: 'TOGGLE_SERIES_STATUS',
            entityName: 'event_series',
            entityId: seriesId,
            newValue: { status }
        });

        res.status(200).json({ message: `Event series status flipped to ${status}.`, series: result.rows[0] });
    } catch (error) {
        console.error(' Series Status Patch Error:', error);
        res.status(500).json({ message: 'Server error switching event series status flags.' });
    }
};