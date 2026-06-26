const db = require('../configs/db');

// GET: FETCH PAGINATED, SEARCHABLE REGISTRATIONS (For Dashboards)
exports.getRegistrationList = async (req, res) => {
    const { eventId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 10;
    const search = req.query.search ? req.query.search.trim() : '';
    const offset = (page - 1) * size;

    try {
        // 1. Detect participation type structure first
        const typeCheck = await db.query('SELECT participation_type FROM event WHERE id = $1 AND is_deleted = false', [eventId]);
        if (typeCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Target event context not found.' });
        }
        const { participation_type } = typeCheck.rows[0];

        let countQuery, dataQuery;
        let countParams = [eventId];
        let dataParams = [eventId, size, offset];

        if (participation_type === 'INDIVIDUAL') {
            let searchClause = '';
            let countClause = '';

            if (search) {
                searchClause = `AND (u.name ILIKE $4 OR u.email ILIKE $4 OR sp.registration_id ILIKE $4)`;
                dataParams.push(`%${search}%`);

                countClause = `AND (u.name ILIKE $2 OR u.email ILIKE $2 OR sp.registration_id ILIKE $2)`;
                countParams.push(`%${search}%`);
            }

            countQuery = `
        SELECT COUNT(*) 
        FROM registration r
        JOIN student_profile sp ON r.student_profile_id = sp.id
        JOIN users u ON sp.user_id = u.id
        WHERE r.event_id = $1 AND r.is_deleted = false ${countClause}
      `;

            dataQuery = `
        SELECT r.id AS registration_id, r.registration_status, r.registered_at,
               u.id AS user_id, u.name, u.email, sp.id AS student_profile_id, sp.registration_id
        FROM registration r
        JOIN student_profile sp ON r.student_profile_id = sp.id
        JOIN users u ON sp.user_id = u.id
        WHERE r.event_id = $1 AND r.is_deleted = false ${searchClause}
        ORDER BY r.registered_at DESC LIMIT $2 OFFSET $3
      `;
        } else {
            // GROUP PARTICIPATION LAYOUTS
            let searchClause = '';
            let countClause = '';

            if (search) {
                searchClause = `AND (t.team_name ILIKE $4)`;
                dataParams.push(`%${search}%`);

                countClause = `AND (t.team_name ILIKE $2)`;
                countParams.push(`%${search}%`);
            }

            countQuery = `
        SELECT COUNT(*) FROM team t 
        WHERE t.event_id = $1 AND t.is_deleted = false ${countClause}
      `;

            dataQuery = `
        SELECT t.id AS team_id, t.team_name, t.team_status, t.registered_at,
               json_agg(json_build_object(
                 'user_id', u.id,
                 'name', u.name,
                 'email', u.email,
                 'registration_id', sp.registration_id
               )) AS members
        FROM team t
        JOIN team_member tm ON t.id = tm.team_id AND tm.is_deleted = false
        JOIN student_profile sp ON tm.student_profile_id = sp.id
        JOIN users u ON sp.user_id = u.id
        WHERE t.event_id = $1 AND t.is_deleted = false ${searchClause}
        GROUP BY t.id, t.team_name, t.team_status, t.registered_at
        ORDER BY t.registered_at DESC LIMIT $2 OFFSET $3
      `;
        }

        const countResult = await db.query(countQuery, countParams);
        const dataResult = await db.query(dataQuery, dataParams);
        const totalRecords = parseInt(countResult.rows[0].count);

        res.status(200).json({
            meta: {
                totalRecords,
                currentPage: page,
                totalPages: Math.ceil(totalRecords / size),
                size
            },
            records: dataResult.rows
        });
    } catch (error) {
        console.error(' Get Registration List Error:', error);
        res.status(500).json({ message: 'Server error parsing event registration index records.' });
    }
};

// GET: STREAM DATA EXPORT (Outputs clean CSV format matching schema exactly)
exports.exportRegistrationData = async (req, res) => {
    const { eventId } = req.params;
    const format = req.query.format ? req.query.format.toLowerCase() : 'csv';

    if (format !== 'csv') {
        return res.status(400).json({ message: 'Format specifier not supported. Only ?format=csv is operational.' });
    }

    try {
        const typeCheck = await db.query('SELECT event_name, participation_type FROM event WHERE id = $1 AND is_deleted = false', [eventId]);
        if (typeCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Target event record missing.' });
        }
        const { event_name, participation_type } = typeCheck.rows[0];

        const sanitizedFilename = event_name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="registrations_${sanitizedFilename}.csv"`);

        if (participation_type === 'INDIVIDUAL') {
            res.write('Registration ID,Status,Registered At,Student Name,Email,Registration ID Number\n');

            const query = `
        SELECT r.id, r.registration_status, r.registered_at, u.name, u.email, sp.registration_id
        FROM registration r
        JOIN student_profile sp ON r.student_profile_id = sp.id
        JOIN users u ON sp.user_id = u.id
        WHERE r.event_id = $1 AND r.is_deleted = false
        ORDER BY r.registered_at ASC
      `;
            const result = await db.query(query, [eventId]);

            for (const row of result.rows) {
                res.write(`"${row.id}","${row.registration_status}","${row.registered_at.toISOString()}","${row.name}","${row.email}","${row.registration_id}"\n`);
            }
        } else {
            res.write('Team ID,Team Name,Team Status,Registered At,Member Name,Member Email,Member Registration ID\n');

            const query = `
        SELECT t.id AS team_id, t.team_name, t.team_status, t.registered_at,
               u.name AS m_name, u.email AS m_email, sp.registration_id AS m_reg
        FROM team t
        JOIN team_member tm ON t.id = tm.team_id AND tm.is_deleted = false
        JOIN student_profile sp ON tm.student_profile_id = sp.id
        JOIN users u ON sp.user_id = u.id
        WHERE t.event_id = $1 AND t.is_deleted = false
        ORDER BY t.registered_at ASC, u.name ASC
      `;
            const result = await db.query(query, [eventId]);

            for (const row of result.rows) {
                res.write(`"${row.team_id}","${row.team_name}","${row.team_status}","${row.registered_at.toISOString()}","${row.m_name}","${row.m_email}","${row.m_reg}"\n`);
            }
        }

        res.end();
    } catch (error) {
        console.error(' Export Data Pipeline Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Internal engine breakdown exporting document data vectors.' });
        }
    }
};