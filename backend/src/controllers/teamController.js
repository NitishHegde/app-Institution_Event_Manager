// backend/src/controllers/teamController.js
const db = require('../configs/db');
const { logAction } = require('../utils/auditLogger');

// 1. GET: RETRIEVE TEAM STRUCTURE & MEMBERS RESPONSES (WITH AUTOMATIC EXPIRY GUARD)
exports.getTeamDetails = async (req, res) => {
    const { teamId } = req.params;

    try {
        // A. Fetch the baseline team status and associated event schedule timelines
        const baselineCheck = await db.query(`
      SELECT t.id, t.team_status, e.event_start_date, e.registration_end_date
      FROM team t
      JOIN event e ON t.event_id = e.id
      WHERE t.id = $1 AND t.is_deleted = false
    `, [teamId]);

        if (baselineCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Target team workspace context not found.' });
        }

        const currentTeam = baselineCheck.rows[0];
        const now = new Date();

        // B. Automated Expiry Guard: Auto-reject if the event started or registration window closed
        if (
            currentTeam.team_status === 'PENDING_APPROVAL' &&
            (now > new Date(currentTeam.event_start_date) || now > new Date(currentTeam.registration_end_date))
        ) {
            await db.query(`
        UPDATE team 
        SET team_status = 'REJECTED', updated_at = NOW() 
        WHERE id = $1
      `, [teamId]);

            currentTeam.team_status = 'REJECTED';
        }

        // C. Execute the standard aggregated member details search query
        const query = `
      SELECT t.id AS team_id, t.team_name, t.team_status, t.registered_at,
             e.id AS event_id, e.event_name, e.min_team_size, e.max_team_size,
             json_agg(json_build_object(
               'member_row_id', tm.id,
               'student_profile_id', sp.id,
               'user_id', u.id,
               'name', u.name,
               'email', u.email,
               'registration_id', sp.registration_id,
               'member_status', tm.member_status
             )) AS members
      FROM team t
      JOIN event e ON t.event_id = e.id
      JOIN team_member tm ON t.id = tm.team_id AND tm.is_deleted = false
      JOIN student_profile sp ON tm.student_profile_id = sp.id
      JOIN users u ON sp.user_id = u.id
      WHERE t.id = $1 AND t.is_deleted = false
      GROUP BY t.id, e.id;
    `;
        const result = await db.query(query, [teamId]);

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(' Get Team Details Error:', error);
        res.status(500).json({ message: 'Server error pulling team structural details.' });
    }
};

// 2. PATCH: RESPOND TO TEAM INVITATION (ACCEPT / REJECT WITH THRESHOLD CHECKING)
exports.respondToInvitation = async (req, res) => {
    const { teamId } = req.params;
    const { response } = req.body; // Expected values: 'ACCEPT' or 'REJECT'
    const { userId } = req.user;   // Authenticated student user

    if (!['ACCEPT', 'REJECT'].includes(response)) {
        return res.status(400).json({ message: 'Invalid parameter. Choice must be ACCEPT or REJECT.' });
    }

    const client = await db.getClient ? await db.getClient() : db;

    try {
        // A. Verify student profile workspace and lookup relationship row
        const profileCheck = await client.query(
            'SELECT id FROM student_profile WHERE user_id = $1 AND is_deleted = false',
            [userId]
        );
        if (profileCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Only registered student profiles can respond to team invitations.' });
        }
        const studentProfileId = profileCheck.rows[0].id;

        const memberCheck = await client.query(`
      SELECT tm.id, tm.member_status, t.team_status, e.min_team_size, e.max_team_size, e.event_start_date, e.registration_end_date
      FROM team_member tm
      JOIN team t ON tm.team_id = t.id
      JOIN event e ON t.event_id = e.id
      WHERE tm.team_id = $1 AND tm.student_profile_id = $2 AND tm.is_deleted = false AND t.is_deleted = false
    `, [teamId, studentProfileId]);

        if (memberCheck.rows.length === 0) {
            return res.status(404).json({ message: 'You are not listed as a member of this team or invitation was revoked.' });
        }

        const membership = memberCheck.rows[0];
        const now = new Date();

        // B. Hard Lifecycle Validation: Block responses if event window closed
        if (now > new Date(membership.event_start_date) || now > new Date(membership.registration_end_date) || membership.team_status === 'REJECTED') {
            return res.status(400).json({ message: 'Action barred: This group entry process has expired or been terminated.' });
        }

        if (membership.member_status !== 'INVITED') {
            return res.status(400).json({ message: `You have already processed this invitation. Current state: ${membership.member_status}` });
        }

        if (db.getClient) await client.query('BEGIN');

        // C. Handle REJECT Pathway
        if (response === 'REJECT') {
            await client.query(`
        UPDATE team_member 
        SET is_deleted = true, member_status = 'REJECTED' 
        WHERE id = $1
      `, [membership.id]);

            if (db.getClient) await client.query('COMMIT');

            await logAction({
                userId, action: 'REJECT_TEAM_INVITATION', entityName: 'team_member', entityId: membership.id, newValue: { team_id: teamId }
            });

            return res.status(200).json({ message: 'Invitation declined successfully.' });
        }

        // D. Handle ACCEPT Pathway
        if (response === 'ACCEPT') {
            await client.query(`
        UPDATE team_member 
        SET member_status = 'ACCEPTED' 
        WHERE id = $1
      `, [membership.id]);

            // Count total accepted team members to evaluate constraints criteria
            const countResult = await client.query(`
        SELECT COUNT(*) FROM team_member 
        WHERE team_id = $1 AND member_status = 'ACCEPTED' AND is_deleted = false
      `, [teamId]);

            const totalAccepted = parseInt(countResult.rows[0].count);

            // Verify team does not spill over maximum allowed sizes
            if (totalAccepted > membership.max_team_size) {
                if (db.getClient) await client.query('ROLLBACK');
                return res.status(400).json({ message: 'Action blocked: Team has already reached maximum capacity parameters.' });
            }

            // Dynamic Threshold Upgrade Check
            let updatedTeamStatus = membership.team_status;
            if (membership.team_status === 'PENDING_APPROVAL' && totalAccepted >= membership.min_team_size) {
                updatedTeamStatus = 'CONFIRMED';
                await client.query(`
          UPDATE team 
          SET team_status = 'CONFIRMED', updated_at = NOW() 
          WHERE id = $1
        `, [teamId]);
            }

            if (db.getClient) await client.query('COMMIT');

            await logAction({
                userId, action: 'ACCEPT_TEAM_INVITATION', entityName: 'team_member', entityId: membership.id,
                newValue: { team_id: teamId, dynamic_team_status: updatedTeamStatus }
            });

            return res.status(200).json({
                message: 'Invitation accepted successfully!',
                teamStatus: updatedTeamStatus,
                acceptedCount: totalAccepted
            });
        }

    } catch (error) {
        if (db.getClient) await client.query('ROLLBACK');
        console.error(' Respond Invitation Error:', error);
        res.status(500).json({ message: 'Internal processing error updating invitation response vector.' });
    } finally {
        if (db.getClient && client.release) client.release();
    }
};

// 3. PATCH: MANUAL COORDINATOR OVERRIDE STATUS (For Staff Owners / Admins)
exports.updateTeamStatusOverride = async (req, res) => {
    const { teamId } = req.params;
    const { teamStatus } = req.body; // Expected: 'CONFIRMED', 'REJECTED', 'DISQUALIFIED'

    if (!['CONFIRMED', 'REJECTED', 'DISQUALIFIED'].includes(teamStatus)) {
        return res.status(400).json({ message: 'Invalid target status override parameter values.' });
    }

    try {
        const query = `
      UPDATE team SET team_status = $1, updated_at = NOW() 
      WHERE id = $2 AND is_deleted = false RETURNING *
    `;
        const result = await db.query(query, [teamStatus, teamId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Target team entity record not found.' });
        }

        await logAction({
            userId: req.user.userId, action: 'MANUAL_TEAM_STATUS_OVERRIDE', entityName: 'team', entityId: teamId, newValue: { team_status: teamStatus }
        });

        res.status(200).json({ message: `Team registration status manually set to ${teamStatus}.`, team: result.rows[0] });
    } catch (error) {
        console.error(' Team Override Error:', error);
        res.status(500).json({ message: 'Server database error applying administrative override.' });
    }
};

// 4. GET: LIST PENDING TEAM INVITATIONS FOR LOGGED-IN STUDENT
exports.getPendingInvitations = async (req, res) => {
    const { userId } = req.user;
    try {
        const profileCheck = await db.query(
            'SELECT id FROM student_profile WHERE user_id = $1 AND is_deleted = false',
            [userId]
        );
        if (profileCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Student profile workspace not found.' });
        }
        const studentProfileId = profileCheck.rows[0].id;

        const query = `
            SELECT t.id AS team_id, t.team_name, t.team_status,
                   e.id AS event_id, e.event_name, e.event_start_date, e.venue,
                   u.name AS inviter_name
            FROM team_member tm
            JOIN team t ON tm.team_id = t.id
            JOIN event e ON t.event_id = e.id
            JOIN student_profile sp_inviter ON t.created_by_student_id = sp_inviter.id
            JOIN users u ON sp_inviter.user_id = u.id
            WHERE tm.student_profile_id = $1 
              AND tm.member_status = 'INVITED' 
              AND tm.is_deleted = false 
              AND t.is_deleted = false
              AND e.is_deleted = false
              AND e.event_end_date >= NOW()
            ORDER BY e.event_start_date ASC;
        `;
        const result = await db.query(query, [studentProfileId]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Get Pending Invitations Error:', error);
        res.status(500).json({ message: 'Server error retrieving pending invitations.' });
    }
};