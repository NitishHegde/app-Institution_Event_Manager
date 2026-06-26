const db = require('../configs/db');
const { logAction } = require('../utils/auditLogger');

exports.registerForEvent = async (req, res) => {
    const { eventId } = req.params;
    const { userId } = req.user; // Logged-in student user ID
    const { teamName, invitedUserIds } = req.body; // Only populated for GROUP events

    const client = await db.getClient ? await db.getClient() : db;

    try {
        // 1. Fetch Event metadata rules to evaluate validation criteria
        const eventQuery = `
      SELECT id, participation_type, event_status, registration_end_date, participant_cap, min_team_size, max_team_size
      FROM event 
      WHERE id = $1 AND is_deleted = false
    `;
        const eventResult = await client.query(eventQuery, [eventId]);
        if (eventResult.rows.length === 0) {
            return res.status(404).json({ message: 'Target event configuration profile not found.' });
        }
        const event = eventResult.rows[0];

        // 2. Universal Rule Checks (Timeline & Status validation)
        if (event.event_status !== 'ACTIVE') {
            return res.status(400).json({ message: 'Registrations are locked: This event is not active.' });
        }
        if (new Date() > new Date(event.registration_end_date)) {
            return res.status(400).json({ message: 'Registration window has officially closed.' });
        }

        // 3. Resolve student profile framework tracking token from base auth user id
        const studentQuery = 'SELECT id FROM student_profile WHERE user_id = $1 AND is_deleted = false';
        const studentResult = await client.query(studentQuery, [userId]);
        if (studentResult.rows.length === 0) {
            return res.status(403).json({ message: 'Access Denied: Only registered student profiles can enroll.' });
        }
        const registrantStudentProfileId = studentResult.rows[0].id;

        // START TRANSACTION
        if (db.getClient) await client.query('BEGIN');

        // =====================================================
        // PATHWAY A: INDIVIDUAL PARTICIPATION EVENT
        // =====================================================
        if (event.participation_type === 'INDIVIDUAL') {
            // Check for an existing registration to prevent duplicates
            const duplicateCheck = await client.query(
                'SELECT id FROM registration WHERE event_id = $1 AND student_profile_id = $2 AND is_deleted = false',
                [eventId, registrantStudentProfileId]
            );
            if (duplicateCheck.rows.length > 0) {
                if (db.getClient) await client.query('ROLLBACK');
                return res.status(400).json({ message: 'You have already registered for this individual event.' });
            }

            // Check capacity cap limits
            const capCheck = await client.query('SELECT COUNT(*) FROM registration WHERE event_id = $1 AND is_deleted = false', [eventId]);
            if (parseInt(capCheck.rows[0].count) >= event.participant_cap) {
                if (db.getClient) await client.query('ROLLBACK');
                return res.status(400).json({ message: 'Registration full: Participant capacity cap reached.' });
            }

            const insertIndividual = `
        INSERT INTO registration (event_id, student_profile_id, registration_status)
        VALUES ($1, $2, 'CONFIRMED') RETURNING *
      `;
            const regResult = await client.query(insertIndividual, [eventId, registrantStudentProfileId]);

            if (db.getClient) await client.query('COMMIT');

            await logAction({
                userId,
                action: 'INDIVIDUAL_EVENT_REGISTRATION',
                entityName: 'registration',
                entityId: regResult.rows[0].id,
                newValue: { event_id: eventId, student_profile_id: registrantStudentProfileId }
            });

            return res.status(201).json({ message: 'Registration complete!', registration: regResult.rows[0] });
        }

        // =====================================================
        // PATHWAY B: GROUP/TEAM PARTICIPATION EVENT
        // =====================================================
        if (event.participation_type === 'GROUP') {
            if (!teamName || !teamName.trim()) {
                if (db.getClient) await client.query('ROLLBACK');
                return res.status(400).json({ message: 'A team name identifier is mandatory for group event mappings.' });
            }

            // Validate total incoming team compilation sizes against constraints
            const proposedTeamMembers = invitedUserIds ? [...new Set(invitedUserIds)] : [];
            // Ensure the creator is counted in the final size calculation loop
            const totalTeamSize = proposedTeamMembers.length + 1;

            if (totalTeamSize < event.min_team_size || totalTeamSize > event.max_team_size) {
                if (db.getClient) await client.query('ROLLBACK');
                return res.status(400).json({
                    message: `Team size validation mismatch. This event strictly demands between ${event.min_team_size} and ${event.max_team_size} members.`
                });
            }

            // 1. Initialize the new Team record block
            const teamInsert = `
        INSERT INTO team (event_id, team_name, created_by_student_id, team_status)
        VALUES ($1, $2, $3, 'PENDING_APPROVAL') RETURNING *
      `;
            const teamResult = await client.query(teamInsert, [eventId, teamName.trim(), registrantStudentProfileId]);
            const newTeam = teamResult.rows[0];

            // 2. Add the team creator to the team_member table
            await client.query(
                'INSERT INTO team_member (team_id, student_profile_id) VALUES ($1, $2)',
                [newTeam.id, registrantStudentProfileId]
            );

            // 3. Iteratively loop and append the searchable invited student profiles
            for (const invUserUuid of proposedTeamMembers) {
                const invProfileCheck = await client.query(
                    'SELECT id FROM student_profile WHERE user_id = $1 AND is_deleted = false',
                    [invUserUuid]
                );
                if (invProfileCheck.rows.length === 0) {
                    throw new Error(`Profile match anomaly: User metadata ${invUserUuid} has no valid student profile workspace setup.`);
                }
                const invitedStudentProfileId = invProfileCheck.rows[0].id;

                // Verify that this student isn't already assigned to a team for this specific event
                const availabilityCheck = await client.query(`
          SELECT 1 FROM team_member tm
          JOIN team t ON tm.team_id = t.id
          WHERE t.event_id = $1 AND tm.student_profile_id = $2 AND t.is_deleted = false AND tm.is_deleted = false
        `, [eventId, invitedStudentProfileId]);

                if (availabilityCheck.rows.length > 0) {
                    throw new Error(`Conflict error: One or more invited members are already registered in a team for this event.`);
                }

                await client.query(
                    'INSERT INTO team_member (team_id, student_profile_id) VALUES ($1, $2)',
                    [newTeam.id, invitedStudentProfileId]
                );
            }

            if (db.getClient) await client.query('COMMIT');

            await logAction({
                userId,
                action: 'TEAM_EVENT_REGISTRATION_INITIALIZED',
                entityName: 'team',
                entityId: newTeam.id,
                newValue: { team_name: teamName, size: totalTeamSize }
            });

            return res.status(201).json({
                message: 'Team entry registered successfully! Invited members have been linked.',
                team: newTeam
            });
        }

    } catch (error) {
        if (db.getClient) await client.query('ROLLBACK');
        console.error(' Registration Engine Breakdown:', error);
        res.status(500).json({ message: error.message || 'Server error tracking event registration.' });
    } finally {
        if (db.getClient && client.release) client.release();
    }
};