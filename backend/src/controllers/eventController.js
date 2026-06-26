// backend/src/controllers/eventController.js
const db = require('../configs/db');
const { logAction } = require('../utils/auditLogger');

// POST: CREATE CORE EVENT & INITIALIZE ASSIGNMENTS
exports.createEvent = async (req, res) => {
    const { userId } = req.user;
    const {
        eventSeriesId, eventName, shortDescription, detailedDescription,
        posterFileId, detailsPdfFileId, venue, ownerId, eventCategoryId,
        participationType, registrationStartDate, registrationEndDate,
        eventStartDate, eventEndDate, participantCap, minTeamSize, maxTeamSize,
        resultPositions, initialCoordinators
    } = req.body;

    const client = await db.getClient ? await db.getClient() : db;

    try {
        if (db.getClient) await client.query('BEGIN');

        const staffResult = await client.query('SELECT id FROM staff_profile WHERE user_id = $1 AND is_deleted = false', [userId]);
        if (staffResult.rows.length === 0) {
            return res.status(403).json({ message: 'Only registered staff profiles are permitted to establish active portal events.' });
        }
        const creatorStaffId = staffResult.rows[0].id;

        // Default parameters start securely hidden in a DRAFT state matrix block
        const eventInsertQuery = `
      INSERT INTO event (
        event_series_id, event_name, short_description, detailed_description,
        poster_file_id, details_pdf_file_id, venue, owner_id, event_category_id,
        participation_type, registration_start_date, registration_end_date,
        event_start_date, event_end_date, participant_cap, min_team_size, max_team_size,
        result_positions, created_by_staff_id, event_status, visibility_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 'DRAFT', 'HIDDEN')
      RETURNING *
    `;

        const eventParams = [
            eventSeriesId, eventName, shortDescription, detailedDescription,
            posterFileId, detailsPdfFileId, venue, ownerId, eventCategoryId,
            participationType, registrationStartDate, registrationEndDate,
            eventStartDate, eventEndDate, participantCap,
            participationType === 'INDIVIDUAL' ? null : minTeamSize,
            participationType === 'INDIVIDUAL' ? null : maxTeamSize,
            resultPositions, creatorStaffId
        ];

        const eventResult = await client.query(eventInsertQuery, eventParams);
        const newEvent = eventResult.rows[0];

        if (initialCoordinators && Array.isArray(initialCoordinators)) {
            for (const coordinator of initialCoordinators) {
                if (!['Faculty_Coordinator', 'Student_Coordinator'].includes(coordinator.type)) {
                    throw new Error(`Invalid type specification profile parameter constraints: ${coordinator.type}`);
                }

                await client.query(
                    `INSERT INTO coordinator_assignment (event_id, user_id, coordinator_type, assigned_by) 
           VALUES ($1, $2, $3, $4)`,
                    [newEvent.id, coordinator.userId, coordinator.type, userId]
                );
            }
        }

        if (db.getClient) await client.query('COMMIT');

        await logAction({
            userId,
            action: 'CREATE_EVENT_WITH_ASSIGNMENTS',
            entityName: 'event',
            entityId: newEvent.id,
            newValue: { event_name: eventName, status: 'DRAFT' }
        });

        res.status(201).json({ message: 'Event initialization process complete.', event: newEvent });
    } catch (error) {
        if (db.getClient) await client.query('ROLLBACK');
        console.error(' Create Event Error:', error);
        res.status(500).json({ message: error.message || 'Database transaction error.' });
    } finally {
        if (db.getClient && client.release) client.release();
    }
};

// PATCH: UPDATE EVENT STATUS (Addressing Question 1)
exports.updateEventStatus = async (req, res) => {
    const { eventId } = req.params;
    const { eventStatus } = req.body; // Expected values: 'DRAFT', 'ACTIVE', 'INACTIVE'

    if (!['DRAFT', 'ACTIVE', 'INACTIVE'].includes(eventStatus)) {
        return res.status(400).json({ message: 'Invalid status choice profile target constraint.' });
    }

    try {
        // Map user visibility state configurations cleanly depending on chosen operational status
        const visibilityStatus = eventStatus === 'ACTIVE' ? 'VISIBLE' : 'HIDDEN';

        const query = `
      UPDATE event 
      SET event_status = $1, visibility_status = $2, updated_at = NOW() 
      WHERE id = $3 AND is_deleted = false 
      RETURNING id, event_name, event_status, visibility_status
    `;
        const result = await db.query(query, [eventStatus, visibilityStatus, eventId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Target event mapping record not found.' });
        }

        await logAction({
            userId: req.user.userId,
            action: 'UPDATE_EVENT_STATUS',
            entityName: 'event',
            entityId: eventId,
            newValue: { event_status: eventStatus, visibility_status: visibilityStatus }
        });

        res.status(200).json({ message: `Event context state shifted to ${eventStatus} successfully.`, event: result.rows[0] });
    } catch (error) {
        console.error(' Update Event Status Error:', error);
        res.status(500).json({ message: 'Server error handling state transition updates.' });
    }
};

// GET: RETRIEVE ASSIGNED COORDINATORS FOR AN EVENT
exports.getEventCoordinators = async (req, res) => {
    const { eventId } = req.params;
    try {
        const query = `
      SELECT ca.id, ca.coordinator_type, u.id AS user_id, u.name, u.email, u.role
      FROM coordinator_assignment ca
      JOIN users u ON ca.user_id = u.id
      WHERE ca.event_id = $1 AND ca.is_deleted = false
      ORDER BY ca.coordinator_type ASC, u.name ASC
    `;
        const result = await db.query(query, [eventId]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(' Get Coordinators Error:', error);
        res.status(500).json({ message: 'Server error processing data lookups.' });
    }
};

// POST: ADD SINGLE NEW COORDINATOR
exports.addCoordinator = async (req, res) => {
    const { eventId } = req.params;
    const { userId, coordinatorType } = req.body;

    if (!['Faculty_Coordinator', 'Student_Coordinator'].includes(coordinatorType)) {
        return res.status(400).json({ message: 'Invalid assignment type definition constraint specified.' });
    }

    try {
        const query = `
      INSERT INTO coordinator_assignment (event_id, user_id, coordinator_type, assigned_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
        const result = await db.query(query, [eventId, userId, coordinatorType, req.user.userId]);

        await logAction({
            userId: req.user.userId,
            action: 'ADD_COORDINATOR_ASSIGNMENT',
            entityName: 'coordinator_assignment',
            entityId: result.rows[0].id,
            newValue: { event_id: eventId, assigned_user: userId, type: coordinatorType }
        });

        res.status(201).json({ message: 'Staff coordinator mapped safely.', assignment: result.rows[0] });
    } catch (error) {
        console.error(' Add Coordinator Error:', error);
        if (error.code === '23505') {
            return res.status(400).json({ message: 'This user profile is already mapped to the control team layout list of this event.' });
        }
        res.status(500).json({ message: 'Server side transaction modification error occurs.' });
    }
};

// DELETE: DISMISS COORDINATOR ASSIGNMENT (Option B - Targeted Single Row Deletion)
exports.deleteCoordinator = async (req, res) => {
    const { id } = req.params;
    try {
        const checkSnapshot = await db.query('SELECT * FROM coordinator_assignment WHERE id = $1 AND is_deleted = false', [id]);
        if (checkSnapshot.rows.length === 0) {
            return res.status(404).json({ message: 'Assignment target entity mapping record mismatch.' });
        }

        const query = `
      UPDATE coordinator_assignment 
      SET is_deleted = true, deleted_at = NOW(), deleted_by = $1 
      WHERE id = $2
    `;
        await db.query(query, [req.user.userId, id]);

        await logAction({
            userId: req.user.userId,
            action: 'REVOKE_COORDINATOR_ASSIGNMENT',
            entityName: 'coordinator_assignment',
            entityId: id,
            oldValue: checkSnapshot.rows[0]
        });

        res.status(200).json({ message: 'Coordinator privileges unmapped from event asset successfully.' });
    } catch (error) {
        console.error(' Delete Assignment Sweep Error:', error);
        res.status(500).json({ message: 'Server database context modification loop exception.' });
    }
};

// Append these functions to the end of backend/src/controllers/eventController.js

// GET: PUBLIC LANDING CAROUSEL (Lightweight payload, unauthenticated)
exports.getPublicLandingEvents = async (req, res) => {
    try {
        // Pulls all upcoming active events that are explicitly set to VISIBLE
        const query = `
            SELECT e.id, e.event_name, e.short_description, e.venue, 
                   e.event_start_date, e.event_end_date, e.poster_file_id, e.participation_type
            FROM event e
            WHERE e.event_status = 'ACTIVE' 
              AND e.visibility_status = 'VISIBLE' 
              AND e.is_deleted = false
              AND e.event_end_date >= NOW()
            ORDER BY e.event_start_date ASC;
        `;
        const result = await db.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(' Public Landing Fetch Error:', error);
        res.status(500).json({ message: 'Server error processing public landing event matrix data.' });
    }
};

// GET: HOME CAROUSELS GROUPED BY CATEGORIES (Using JSON aggregation)
exports.getCategorizedHomeEvents = async (req, res) => {
    try {
         const query = `
            SELECT ec.id AS category_id, ec.category_name, ec.category_type,
                   json_agg(json_build_object(
                       'id', e.id,
                       'event_name', e.event_name,
                       'short_description', e.short_description,
                       'venue', e.venue,
                       'event_start_date', e.event_start_date,
                       'poster_file_id', e.poster_file_id,
                       'participation_type', e.participation_type,
                       'series_name', es.series_name
                   )) AS events
            FROM event_category ec
            JOIN event e ON ec.id = e.event_category_id
            LEFT JOIN event_series es ON e.event_series_id = es.id
            WHERE e.event_status = 'ACTIVE'
              AND e.visibility_status = 'VISIBLE'
              AND e.is_deleted = false
              AND ec.is_deleted = false
              AND e.event_end_date >= NOW()
            GROUP BY ec.id, ec.category_name, ec.category_type
            ORDER BY ec.category_name ASC;
        `;
        const result = await db.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(' Categorized Home Events Error:', error);
        res.status(500).json({ message: 'Server error building categorized home discovery feeds.' });
    }
};

// GET: DEEP SPECIFIC INDIVIDUAL EVENT DETAILS (For detailed landing sheets)
exports.getSingleEventDetails = async (req, res) => {
    const { eventId } = req.params;
    try {
        const query = `
            SELECT e.*, 
                   es.series_name, 
                   ec.category_name, 
                   o.owner_name, o.owner_type,
                   u_creator.name AS creator_staff_name,
                   fs_poster.file_name AS poster_name, fs_poster.storage_path AS poster_path,
                   fs_pdf.file_name AS pdf_name, fs_pdf.storage_path AS pdf_path
            FROM event e
            JOIN event_series es ON e.event_series_id = es.id
            JOIN event_category ec ON e.event_category_id = ec.id
            JOIN owner o ON e.owner_id = o.id
            JOIN staff_profile sp_creator ON e.created_by_staff_id = sp_creator.id
            JOIN users u_creator ON sp_creator.user_id = u_creator.id
            LEFT JOIN file_store fs_poster ON e.poster_file_id = fs_poster.id
            LEFT JOIN file_store fs_pdf ON e.details_pdf_file_id = fs_pdf.id
            WHERE e.id = $1 AND e.is_deleted = false;
        `;
        const result = await db.query(query, [eventId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Target event workspace detail record missing.' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(' Get Single Event Details Error:', error);
        res.status(500).json({ message: 'Server error resolving individual comprehensive event maps.' });
    }
};


const path = require('path');
const fs = require('fs');

// GET: STREAM EVENT POSTER BINARY TO BROWSER <img> TAGS
exports.streamEventPoster = async (req, res) => {
    const { fileId } = req.params;

    try {
        // 1. Look up where the file is stored in your file_store table
        const query = 'SELECT storage_path, file_type FROM file_store WHERE id = $1 AND is_deleted = false';
        const result = await db.query(query, [fileId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Requested image file not found.' });
        }

        const fileRecord = result.rows[0];
        const absolutePath = path.resolve(fileRecord.storage_path);

        // 2. Verify the file physically exists on your local server disk
        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ message: 'File missing from server storage disk.' });
        }

        // 3. Set the content type header so the browser knows it's an image
        res.setHeader('Content-Type', fileRecord.file_type || 'image/jpeg');

        // 4. Stream the image bytes directly to the frontend
        fs.createReadStream(absolutePath).pipe(res);
    } catch (error) {
        console.error('File Streaming Error:', error);
        res.status(500).json({ message: 'Server error reading image asset data.' });
    }
};

// GET: STAFF DASHBOARD CREATED & COORDINATING EVENTS
exports.getStaffDashboardEvents = async (req, res) => {
    const { userId } = req.user;
    try {
        // 1. Fetch events created by this staff user
        const createdQuery = `
            SELECT e.id, e.event_name, e.event_status, e.event_start_date, e.venue, es.series_name, ec.category_name
            FROM event e
            JOIN staff_profile sp ON e.created_by_staff_id = sp.id
            LEFT JOIN event_series es ON e.event_series_id = es.id
            LEFT JOIN event_category ec ON e.event_category_id = ec.id
            WHERE sp.user_id = $1 AND e.is_deleted = false
            ORDER BY e.created_at DESC
        `;
        
        // 2. Fetch events where the user is a coordinator
        const coordinatingQuery = `
            SELECT DISTINCT e.id, e.event_name, e.event_status, e.event_start_date, e.venue, es.series_name, ec.category_name, e.created_at
            FROM event e
            JOIN coordinator_assignment ca ON e.id = ca.event_id
            LEFT JOIN event_series es ON e.event_series_id = es.id
            LEFT JOIN event_category ec ON e.event_category_id = ec.id
            WHERE ca.user_id = $1 AND ca.is_deleted = false AND e.is_deleted = false
            ORDER BY e.created_at DESC
        `;

        const [createdRes, coordRes] = await Promise.all([
            db.query(createdQuery, [userId]),
            db.query(coordinatingQuery, [userId])
        ]);

        res.status(200).json({
            createdEvents: createdRes.rows,
            coordinatingEvents: coordRes.rows
        });
    } catch (error) {
        console.error('Error fetching staff dashboard events:', error);
        res.status(500).json({ message: 'Internal server error fetching dashboard events.' });
    }
};

// PUT: UPDATE EVENT DETAILS WITH CREATOR VS COORDINATOR ROLE VALIDATION
exports.updateEventDetails = async (req, res) => {
    const { eventId } = req.params;
    const { userId } = req.user;
    const {
        eventSeriesId, eventName, shortDescription, detailedDescription,
        posterFileId, detailsPdfFileId, venue, ownerId, eventCategoryId,
        participationType, registrationStartDate, registrationEndDate,
        eventStartDate, eventEndDate, participantCap, minTeamSize, maxTeamSize,
        resultPositions, facultyCoordinators, studentCoordinators
    } = req.body;

    const client = await db.getClient ? await db.getClient() : db;

    try {
        // 1. Fetch existing event
        const eventQuery = `SELECT * FROM event WHERE id = $1 AND is_deleted = false`;
        const eventResult = await client.query(eventQuery, [eventId]);
        if (eventResult.rows.length === 0) {
            return res.status(404).json({ message: 'Event not found.' });
        }
        const event = eventResult.rows[0];

        // 2. Fetch user's staff profile ID
        const staffQuery = `SELECT id FROM staff_profile WHERE user_id = $1 AND is_deleted = false`;
        const staffResult = await client.query(staffQuery, [userId]);
        const isCreator = staffResult.rows.length > 0 && event.created_by_staff_id === staffResult.rows[0].id;

        // 3. Verify if user is coordinator
        const coordCheck = await client.query(
            `SELECT id FROM coordinator_assignment WHERE event_id = $1 AND user_id = $2 AND is_deleted = false`,
            [eventId, userId]
        );
        const isCoordinator = coordCheck.rows.length > 0;

        if (!isCreator && !isCoordinator) {
            return res.status(403).json({ message: 'You do not have authorization to edit this event.' });
        }

        if (db.getClient) await client.query('BEGIN');

        // 4. Update core event table
        let updateQuery = '';
        let params = [];

        if (isCreator) {
            // Creator can update everything
            updateQuery = `
                UPDATE event SET
                    event_series_id = $1, event_name = $2, short_description = $3, detailed_description = $4,
                    poster_file_id = $5, details_pdf_file_id = $6, venue = $7, owner_id = $8, event_category_id = $9,
                    participation_type = $10, registration_start_date = $11, registration_end_date = $12,
                    event_start_date = $13, event_end_date = $14, participant_cap = $15, 
                    min_team_size = $16, max_team_size = $17, result_positions = $18, updated_at = NOW()
                WHERE id = $19 RETURNING *
            `;
            params = [
                eventSeriesId || event.event_series_id,
                eventName || event.event_name,
                shortDescription, detailedDescription,
                posterFileId !== undefined ? posterFileId : event.poster_file_id,
                detailsPdfFileId !== undefined ? detailsPdfFileId : event.details_pdf_file_id,
                venue,
                ownerId || event.owner_id,
                eventCategoryId || event.event_category_id,
                participationType || event.participation_type,
                registrationStartDate, registrationEndDate,
                eventStartDate, eventEndDate, participantCap,
                participationType === 'INDIVIDUAL' ? null : minTeamSize,
                participationType === 'INDIVIDUAL' ? null : maxTeamSize,
                resultPositions, eventId
            ];
        } else {
            // Coordinator cannot update event_series_id, event_name, owner_id, event_category_id, participation_type
            updateQuery = `
                UPDATE event SET
                    short_description = $1, detailed_description = $2,
                    poster_file_id = $3, details_pdf_file_id = $4, venue = $5,
                    registration_start_date = $6, registration_end_date = $7,
                    event_start_date = $8, event_end_date = $9, participant_cap = $10, 
                    min_team_size = $11, max_team_size = $12, result_positions = $13, updated_at = NOW()
                WHERE id = $14 RETURNING *
            `;
            params = [
                shortDescription, detailedDescription,
                posterFileId !== undefined ? posterFileId : event.poster_file_id,
                detailsPdfFileId !== undefined ? detailsPdfFileId : event.details_pdf_file_id,
                venue,
                registrationStartDate, registrationEndDate,
                eventStartDate, eventEndDate, participantCap,
                event.participation_type === 'INDIVIDUAL' ? null : minTeamSize,
                event.participation_type === 'INDIVIDUAL' ? null : maxTeamSize,
                resultPositions, eventId
            ];
        }

        const updateResult = await client.query(updateQuery, params);

        // 5. If creator, update coordinators
        if (isCreator) {
            // We'll soft-delete all current coordinator assignments
            await client.query(`UPDATE coordinator_assignment SET is_deleted = true, deleted_at = NOW(), deleted_by = $1 WHERE event_id = $2`, [userId, eventId]);

            // Re-insert Faculty Coordinators
            if (facultyCoordinators && Array.isArray(facultyCoordinators)) {
                for (const facultyId of facultyCoordinators) {
                    await client.query(`
                        INSERT INTO coordinator_assignment (event_id, user_id, coordinator_type, assigned_by)
                        VALUES ($1, $2, 'Faculty_Coordinator', $3)
                        ON CONFLICT (event_id, user_id) DO UPDATE SET is_deleted = false, updated_at = NOW(), assigned_by = $3
                    `, [eventId, facultyId, userId]);
                }
            }

            // Re-insert Student Coordinators
            if (studentCoordinators && Array.isArray(studentCoordinators)) {
                for (const studentId of studentCoordinators) {
                    await client.query(`
                        INSERT INTO coordinator_assignment (event_id, user_id, coordinator_type, assigned_by)
                        VALUES ($1, $2, 'Student_Coordinator', $3)
                        ON CONFLICT (event_id, user_id) DO UPDATE SET is_deleted = false, updated_at = NOW(), assigned_by = $3
                    `, [eventId, studentId, userId]);
                }
            }
        }

        if (db.getClient) await client.query('COMMIT');

        await logAction({
            userId,
            action: 'UPDATE_EVENT_DETAILS',
            entityName: 'event',
            entityId: eventId,
            newValue: { event_name: event.event_name }
        });

        res.status(200).json({ message: 'Event details updated successfully.', event: updateResult.rows[0] });
    } catch (error) {
        if (db.getClient) await client.query('ROLLBACK');
        console.error('Update Event Details Error:', error);
        res.status(500).json({ message: error.message || 'Database transaction error.' });
    } finally {
        if (db.getClient && client.release) client.release();
    }
};