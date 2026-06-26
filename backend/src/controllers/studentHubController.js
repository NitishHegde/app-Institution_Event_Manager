const db = require('../configs/db');

// 1. GET: FETCH ALL PARTICIPATION CATEGORIES FOR LOGGED-IN STUDENT
exports.getMyParticipations = async (req, res) => {
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

        // A. Registered Events (Future events where user/team is confirmed)
        const registeredQuery = `
      SELECT DISTINCT e.id, e.event_name, e.event_start_date, e.venue, e.participation_type
      FROM event e
      LEFT JOIN registration r ON e.id = r.event_id AND r.student_profile_id = $1 AND r.is_deleted = false
      LEFT JOIN team t ON e.id = t.event_id AND t.is_deleted = false AND t.team_status = 'CONFIRMED'
      LEFT JOIN team_member tm ON t.id = tm.team_id AND tm.student_profile_id = $1 AND tm.is_deleted = false AND tm.member_status = 'ACCEPTED'
      WHERE e.event_end_date >= NOW() AND e.is_deleted = false
        AND (r.id IS NOT NULL OR tm.id IS NOT NULL);
    `;

        // B. Completed Events (Past events where student attendance status was explicitly marked PRESENT)
        const completedQuery = `
      SELECT e.id, e.event_name, e.event_start_date, e.venue, att.marked_at
      FROM attendance att
      JOIN event e ON att.event_id = e.id
      WHERE att.student_profile_id = $1 AND att.attendance_status = 'PRESENT' AND att.is_deleted = false AND e.is_deleted = false
      ORDER BY e.event_start_date DESC;
    `;

        // C. Won Events (Podium placement items found in result registries)
        const wonQuery = `
      SELECT e.id, e.event_name, r.position_name, r.position_rank, r.published_at
      FROM result_recipient rr
      JOIN result r ON rr.result_id = r.id
      JOIN event e ON r.event_id = e.id
      LEFT JOIN team_member tm ON rr.team_id = tm.team_id AND tm.student_profile_id = $1 AND tm.is_deleted = false
      WHERE (rr.student_profile_id = $1 OR tm.student_profile_id = $1)
        AND rr.is_deleted = false AND r.is_deleted = false AND e.is_deleted = false
      ORDER BY r.position_rank ASC;
    `;

        const [regRes, compRes, wonRes] = await Promise.all([
            db.query(registeredQuery, [studentProfileId]),
            db.query(completedQuery, [studentProfileId]),
            db.query(wonQuery, [studentProfileId])
        ]);

        res.status(200).json({
            registeredEvents: regRes.rows,
            completedEvents: compRes.rows,
            wonEvents: wonRes.rows
        });
    } catch (error) {
        console.error('Get Student Participations Error:', error);
        res.status(500).json({ message: 'Server error parsing individual historical tracking data rows.' });
    }
};

// 2. GET: ACCOMPLISHMENTS VIEW
exports.getMyAccomplishments = async (req, res) => {
    const { userId } = req.user;
    try {
        const profile = await db.query('SELECT id FROM student_profile WHERE user_id = $1 AND is_deleted = false', [userId]);
        if (profile.rows.length === 0) return res.status(404).json({ message: 'Profile missing.' });

        const query = `
      SELECT r.position_name, r.position_rank, e.event_name, e.event_start_date
      FROM result_recipient rr
      JOIN result r ON rr.result_id = r.id
      JOIN event e ON r.event_id = e.id
      LEFT JOIN team_member tm ON rr.team_id = tm.team_id AND tm.student_profile_id = $1 AND tm.is_deleted = false
      WHERE (rr.student_profile_id = $1 OR tm.student_profile_id = $1)
        AND rr.is_deleted = false AND r.is_deleted = false
      ORDER BY e.event_start_date DESC;
    `;
        const result = await db.query(query, [profile.rows[0].id]);
        res.status(200).json({ accomplishments: result.rows });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving honors.' });
    }
};

// 3. GET: CALCULATE STAR RATING ON THE GO
exports.getMyStarRating = async (req, res) => {
    const { userId } = req.user;
    try {
        const profile = await db.query('SELECT id FROM student_profile WHERE user_id = $1 AND is_deleted = false', [userId]);
        if (profile.rows.length === 0) return res.status(404).json({ message: 'Profile missing.' });

        const countRes = await db.query(
            "SELECT COUNT(*) FROM attendance WHERE student_profile_id = $1 AND attendance_status = 'PRESENT' AND is_deleted = false",
            [profile.rows[0].id]
        );
        const attendedCount = parseInt(countRes.rows[0].count);

        // Dynamic Logic: 1 Star per event attended, maxing out at 5 Stars
        let stars = 0;
        if (attendedCount > 0) stars = Math.min(5, attendedCount);

        res.status(200).json({ attendedCount, starRating: stars });
    } catch (error) {
        res.status(500).json({ message: 'Error parsing telemetry stars.' });
    }
};

// 4. GET & PUT: MY PROFILE WRAPPERS
exports.getMyProfile = async (req, res) => {
    try {
        const query = `
      SELECT u.id AS user_id, u.name, u.email, sp.id AS student_profile_id, sp.registration_id, s.school_name
      FROM users u
      JOIN student_profile sp ON u.id = sp.user_id
      JOIN school s ON sp.school_id = s.id
      WHERE u.id = $1 AND u.is_deleted = false;
    `;
        const result = await db.query(query, [req.user.userId]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Profile vector empty.' });
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Profile read block error.' });
    }
};

exports.updateMyProfile = async (req, res) => {
    const { name } = req.body;
    try {
        const query = `UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING name, email`;
        const result = await db.query(query, [name, req.user.userId]);
        res.status(200).json({ message: 'Profile synchronized.', updatedUser: result.rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Profile write block error.' });
    }
};

// =====================================================
// STAFF COMPONENT: SEARCH & REVIEW STUDENT ARCHIVES
// =====================================================

exports.searchStudents = async (req, res) => {
    const { name, registrationId, schoolId } = req.query;
    try {
        let query = `
      SELECT u.id AS user_id, sp.id AS student_profile_id, u.name, u.email, sp.registration_id, s.school_name
      FROM student_profile sp
      JOIN users u ON sp.user_id = u.id
      JOIN school s ON sp.school_id = s.id
      WHERE sp.is_deleted = false AND u.is_deleted = false
    `;
        const params = [];
        let counter = 1;

        if (name) {
            query += ` AND u.name ILIKE $${counter}`;
            params.push(`%${name}%`);
            counter++;
        }
        if (registrationId) {
            query += ` AND sp.registration_id ILIKE $${counter}`;
            params.push(`%${registrationId}%`);
            counter++;
        }
        if (schoolId) {
            query += ` AND sp.school_id = $${counter}`;
            params.push(schoolId);
            counter++;
        }

        const result = await db.query(query, params);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: 'Search query parsing failure.' });
    }
};

exports.getStudentDetailsById = async (req, res) => {
    const { studentId } = req.params; // Expects student_profile.id
    try {
        const profileQuery = `
      SELECT sp.id AS student_profile_id, u.name, u.email, sp.registration_id, s.school_name
      FROM student_profile sp
      JOIN users u ON sp.user_id = u.id
      JOIN school s ON sp.school_id = s.id
      WHERE sp.id = $1 AND sp.is_deleted = false;
    `;
        const profileRes = await db.query(profileQuery, [studentId]);
        if (profileRes.rows.length === 0) return res.status(404).json({ message: 'Student profile mismatch.' });

        // History
        const historyQuery = `
      SELECT e.event_name, att.attendance_status, att.marked_at
      FROM attendance att
      JOIN event e ON att.event_id = e.id
      WHERE att.student_profile_id = $1 AND att.is_deleted = false;
    `;

        // Accomplishments
        const awardsQuery = `
      SELECT r.position_name, r.position_rank, e.event_name
      FROM result_recipient rr
      JOIN result r ON rr.result_id = r.id
      JOIN event e ON r.event_id = e.id
      LEFT JOIN team_member tm ON rr.team_id = tm.team_id AND tm.student_profile_id = $1 AND tm.is_deleted = false
      WHERE (rr.student_profile_id = $1 OR tm.student_profile_id = $1) AND rr.is_deleted = false;
    `;

        const [histRes, awardRes] = await Promise.all([
            db.query(historyQuery, [studentId]),
            db.query(awardsQuery, [studentId])
        ]);

        res.status(200).json({
            profile: profileRes.rows[0],
            participationHistory: histRes.rows,
            accomplishments: awardRes.rows
        });
    } catch (error) {
        res.status(500).json({ message: 'Error stitching structural profiles together.' });
    }
};