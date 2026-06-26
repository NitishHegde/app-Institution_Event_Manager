// backend/src/controllers/evaluationController.js
const db = require('../configs/db');
const { logAction } = require('../utils/auditLogger');

// Helper: generate human-readable ordinal position label
const getPositionLabel = (rank) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = rank % 100;
    return rank + (s[(v - 20) % 10] || s[v] || s[0]) + ' Place';
};

// 1. GET: FETCH ATTENDANCE SHEET WITH EXISTING MARKS
exports.getAttendanceSheet = async (req, res) => {
    const { eventId } = req.params;
    try {
        const typeCheck = await db.query(
            'SELECT participation_type FROM event WHERE id = $1 AND is_deleted = false',
            [eventId]
        );
        if (typeCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Target event record missing.' });
        }
        const { participation_type } = typeCheck.rows[0];

        let participants;
        if (participation_type === 'INDIVIDUAL') {
            const result = await db.query(`
                SELECT sp.id AS student_profile_id, u.name, u.email, sp.registration_id,
                       COALESCE(a.attendance_status, 'PRESENT') AS attendance_status
                FROM registration r
                JOIN student_profile sp ON r.student_profile_id = sp.id
                JOIN users u ON sp.user_id = u.id
                LEFT JOIN attendance a ON a.event_id = $1 AND a.student_profile_id = sp.id AND a.is_deleted = false
                WHERE r.event_id = $1 AND r.is_deleted = false
                ORDER BY u.name ASC
            `, [eventId]);
            participants = result.rows;
        } else {
            // GROUP — flat list with team context, frontend groups by team_id
            const result = await db.query(`
                SELECT sp.id AS student_profile_id, u.name, u.email, sp.registration_id,
                       t.id AS team_id, t.team_name,
                       COALESCE(a.attendance_status, 'PRESENT') AS attendance_status
                FROM team t
                JOIN team_member tm ON t.id = tm.team_id AND tm.is_deleted = false
                JOIN student_profile sp ON tm.student_profile_id = sp.id
                JOIN users u ON sp.user_id = u.id
                LEFT JOIN attendance a ON a.event_id = $1 AND a.student_profile_id = sp.id AND a.is_deleted = false
                WHERE t.event_id = $1 AND t.is_deleted = false
                ORDER BY t.team_name ASC, u.name ASC
            `, [eventId]);
            participants = result.rows;
        }

        res.status(200).json({ participationType: participation_type, participants });
    } catch (error) {
        console.error(' Get Attendance Sheet Error:', error);
        res.status(500).json({ message: 'Server error fetching attendance sheet data.' });
    }
};

// 2. POST: BULK UPDATE ATTENDANCE SHEETS (Upsert Pattern)
exports.submitBulkAttendance = async (req, res) => {
    const { eventId } = req.params;
    const { attendanceSheet } = req.body; // Array: [{ studentProfileId: 'uuid', status: 'PRESENT'|'ABSENT' }]
    const { userId } = req.user;

    if (!Array.isArray(attendanceSheet) || attendanceSheet.length === 0) {
        return res.status(400).json({ message: 'Attendance sheet payload array cannot be empty.' });
    }

    const client = await db.getClient ? await db.getClient() : db;

    try {
        if (db.getClient) await client.query('BEGIN');

        for (const record of attendanceSheet) {
            const { studentProfileId, status } = record;

            if (!['PRESENT', 'ABSENT'].includes(status)) {
                throw new Error(`Invalid attendance status: ${status}`);
            }

            const upsertQuery = `
                INSERT INTO attendance (event_id, student_profile_id, attendance_status, marked_by_user_id, marked_at)
                VALUES ($1, $2, $3, $4, NOW())
                ON CONFLICT (event_id, student_profile_id)
                DO UPDATE SET attendance_status = EXCLUDED.attendance_status,
                              marked_by_user_id = EXCLUDED.marked_by_user_id,
                              marked_at = NOW()
                RETURNING id;
            `;
            await client.query(upsertQuery, [eventId, studentProfileId, status, userId]);
        }

        if (db.getClient) await client.query('COMMIT');

        await logAction({
            userId,
            action: 'BULK_ATTENDANCE_MARKED',
            entityName: 'attendance',
            entityId: eventId,
            newValue: { updatedCount: attendanceSheet.length }
        });

        res.status(200).json({ message: 'Attendance saved successfully.' });
    } catch (error) {
        if (db.getClient) await client.query('ROLLBACK');
        console.error(' Attendance Submit Error:', error);
        res.status(500).json({ message: error.message || 'Server error saving attendance records.' });
    } finally {
        if (db.getClient && client.release) client.release();
    }
};

// 3. GET: FETCH EXISTING PODIUM RESULTS
exports.getPodiumResults = async (req, res) => {
    const { eventId } = req.params;
    try {
        const typeCheck = await db.query(
            'SELECT participation_type, result_positions FROM event WHERE id = $1 AND is_deleted = false',
            [eventId]
        );
        if (typeCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Target event record missing.' });
        }
        const { participation_type, result_positions } = typeCheck.rows[0];

        const query = `
            SELECT r.position_rank, r.position_name,
                   rr.student_profile_id, rr.team_id,
                   u.name AS recipient_name, sp.registration_id,
                   t.team_name
            FROM result r
            JOIN result_recipient rr ON rr.result_id = r.id AND rr.is_deleted = false
            LEFT JOIN student_profile sp ON rr.student_profile_id = sp.id
            LEFT JOIN users u ON sp.user_id = u.id
            LEFT JOIN team t ON rr.team_id = t.id
            WHERE r.event_id = $1 AND r.is_deleted = false
            ORDER BY r.position_rank ASC
        `;
        const result = await db.query(query, [eventId]);

        // Group recipients by position rank
        const positionsMap = {};
        for (const row of result.rows) {
            if (!positionsMap[row.position_rank]) {
                positionsMap[row.position_rank] = {
                    positionRank: row.position_rank,
                    positionName: row.position_name,
                    recipients: []
                };
            }
            positionsMap[row.position_rank].recipients.push({
                id: participation_type === 'INDIVIDUAL' ? row.student_profile_id : row.team_id,
                name: participation_type === 'INDIVIDUAL' ? row.recipient_name : row.team_name,
                registrationId: row.registration_id || null
            });
        }

        res.status(200).json({
            participationType: participation_type,
            resultPositions: result_positions,
            positions: Object.values(positionsMap)
        });
    } catch (error) {
        console.error(' Get Podium Results Error:', error);
        res.status(500).json({ message: 'Server error fetching podium results.' });
    }
};

// 4. POST: ASSIGN PODIUM POSITION WINNERS (supports multiple recipients per position)
exports.submitPodiumPositions = async (req, res) => {
    const { eventId } = req.params;
    const { positions } = req.body;
    /*
      Expected Body:
      {
        "positions": [
          { "positionName": "1st Place", "positionRank": 1, "targetIds": ["uuid1", "uuid2"] },
          { "positionName": "2nd Place", "positionRank": 2, "targetIds": ["uuid3"] }
        ]
      }
    */

    if (!Array.isArray(positions) || positions.length === 0) {
        return res.status(400).json({ message: 'Positions data array is required and cannot be empty.' });
    }

    const client = await db.getClient ? await db.getClient() : db;

    try {
        const typeCheck = await client.query(
            'SELECT participation_type, result_positions FROM event WHERE id = $1 AND is_deleted = false',
            [eventId]
        );
        if (typeCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Target event record missing.' });
        }
        const { participation_type, result_positions } = typeCheck.rows[0];

        if (db.getClient) await client.query('BEGIN');

        // Soft-delete all previously published results
        await client.query(`
            UPDATE result_recipient SET is_deleted = true, deleted_at = NOW()
            WHERE result_id IN (SELECT id FROM result WHERE event_id = $1)
        `, [eventId]);
        await client.query(
            'UPDATE result SET is_deleted = true, deleted_at = NOW() WHERE event_id = $1',
            [eventId]
        );

        for (const position of positions) {
            const { positionName, positionRank, targetIds } = position;

            if (positionRank > result_positions) {
                throw new Error(`Rank ${positionRank} exceeds the configured limit of ${result_positions} positions.`);
            }
            if (!Array.isArray(targetIds) || targetIds.length === 0) continue;

            // ONE result row per position rank
            const resultRes = await client.query(`
                INSERT INTO result (event_id, position_name, position_rank, published_by_user_id, published_at)
                VALUES ($1, $2, $3, $4, NOW()) RETURNING id;
            `, [eventId, positionName, positionRank, req.user.userId]);
            const newResultId = resultRes.rows[0].id;

            // MULTIPLE result_recipient rows for this position
            for (const targetId of targetIds) {
                if (participation_type === 'INDIVIDUAL') {
                    await client.query(
                        'INSERT INTO result_recipient (result_id, student_profile_id) VALUES ($1, $2)',
                        [newResultId, targetId]
                    );
                } else {
                    await client.query(
                        'INSERT INTO result_recipient (result_id, team_id) VALUES ($1, $2)',
                        [newResultId, targetId]
                    );
                }
            }
        }

        if (db.getClient) await client.query('COMMIT');

        await logAction({
            userId: req.user.userId,
            action: 'PODIUM_WINNERS_PUBLISHED',
            entityName: 'result',
            entityId: eventId,
            newValue: { positions_count: positions.length }
        });

        res.status(201).json({ message: 'Podium results published successfully.' });
    } catch (error) {
        if (db.getClient) await client.query('ROLLBACK');
        console.error(' Podium Submit Error:', error);
        res.status(500).json({ message: error.message || 'Server error publishing podium results.' });
    } finally {
        if (db.getClient && client.release) client.release();
    }
};