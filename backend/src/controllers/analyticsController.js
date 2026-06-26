const db = require('../configs/db');

exports.getPastEventsList = async (req, res) => {
    try {
        const { includeAll } = req.query;
        const pastFilter = includeAll === 'true' ? '' : 'AND event_end_date < CURRENT_TIMESTAMP';
        const query = `
            SELECT id, event_name, event_end_date 
            FROM event 
            WHERE is_deleted = false ${pastFilter}
            ORDER BY event_end_date DESC
        `;
        const result = await db.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching past events list:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

exports.getOrganizationStats = async (req, res) => {
    try {
        const { seriesId, categoryId, categoryType, startDate, endDate, includeAll } = req.query;

        // Build the base WHERE clause for filtering
        // When includeAll=true, skip the past-events-only filter
        let filterClauses = ['e.is_deleted = false'];
        if (includeAll !== 'true') {
            filterClauses.push('e.event_end_date < CURRENT_TIMESTAMP');
        }
        let values = [];
        let paramCount = 1;

        if (seriesId) {
            filterClauses.push(`e.event_series_id = $${paramCount++}`);
            values.push(seriesId);
        }
        if (categoryId) {
            filterClauses.push(`e.event_category_id = $${paramCount++}`);
            values.push(categoryId);
        }
        if (categoryType) {
            filterClauses.push(`ec.category_type = $${paramCount++}`);
            values.push(categoryType);
        }
        if (startDate) {
            filterClauses.push(`e.event_start_date >= $${paramCount++}`);
            values.push(startDate);
        }
        if (endDate) {
            filterClauses.push(`e.event_end_date <= $${paramCount++}`);
            values.push(endDate);
        }

        const whereString = filterClauses.length > 0 ? 'WHERE ' + filterClauses.join(' AND ') : '';

        // 1. Top Metrics: Total Events, Total Participants, Unique Schools
        const metricsQuery = `
            WITH FilteredEvents AS (
                SELECT e.id
                FROM event e
                LEFT JOIN event_category ec ON e.event_category_id = ec.id
                ${whereString}
            ),
            EventParticipation AS (
                SELECT r.event_id, COUNT(DISTINCT sp.id) as participant_count
                FROM registration r
                JOIN student_profile sp ON r.student_profile_id = sp.id
                WHERE r.is_deleted = false AND r.event_id IN (SELECT id FROM FilteredEvents)
                GROUP BY r.event_id
                
                UNION ALL
                
                SELECT t.event_id, COUNT(DISTINCT tm.student_profile_id) as participant_count
                FROM team t
                JOIN team_member tm ON t.id = tm.team_id
                WHERE t.is_deleted = false AND tm.is_deleted = false AND t.event_id IN (SELECT id FROM FilteredEvents)
                GROUP BY t.event_id
            ),
            SchoolParticipation AS (
                SELECT DISTINCT sp.school_id
                FROM registration r
                JOIN student_profile sp ON r.student_profile_id = sp.id
                WHERE r.is_deleted = false AND r.event_id IN (SELECT id FROM FilteredEvents)
                
                UNION
                
                SELECT DISTINCT sp.school_id
                FROM team t
                JOIN team_member tm ON t.id = tm.team_id
                JOIN student_profile sp ON tm.student_profile_id = sp.id
                WHERE t.is_deleted = false AND tm.is_deleted = false AND t.event_id IN (SELECT id FROM FilteredEvents)
            )
            SELECT 
                (SELECT COUNT(*) FROM FilteredEvents) as total_events,
                (SELECT COALESCE(SUM(participant_count), 0) FROM EventParticipation) as total_participants,
                (SELECT COUNT(*) FROM SchoolParticipation) as unique_schools
        `;

        // 2. Monthly Trend of Number of Events
        const eventsTrendQuery = `
            SELECT to_char(date_trunc('month', e.event_end_date), 'Mon YYYY') as month, 
                   COUNT(e.id) as event_count,
                   MIN(e.event_end_date) as sort_date
            FROM event e
            LEFT JOIN event_category ec ON e.event_category_id = ec.id
            ${whereString}
            GROUP BY date_trunc('month', e.event_end_date)
            ORDER BY sort_date ASC
        `;

        // 3. Monthly Trend of Participation
        const participationTrendQuery = `
            WITH FilteredEvents AS (
                SELECT e.id, date_trunc('month', e.event_end_date) as month_val
                FROM event e
                LEFT JOIN event_category ec ON e.event_category_id = ec.id
                ${whereString}
            )
            SELECT to_char(fe.month_val, 'Mon YYYY') as month, 
                   COUNT(DISTINCT sp.id) as participant_count,
                   MIN(fe.month_val) as sort_date
            FROM FilteredEvents fe
            LEFT JOIN registration r ON fe.id = r.event_id AND r.is_deleted = false
            LEFT JOIN team t ON fe.id = t.event_id AND t.is_deleted = false
            LEFT JOIN team_member tm ON t.id = tm.team_id AND tm.is_deleted = false
            LEFT JOIN student_profile sp ON sp.id = COALESCE(r.student_profile_id, tm.student_profile_id)
            WHERE sp.id IS NOT NULL
            GROUP BY fe.month_val
            ORDER BY sort_date ASC
        `;

        // 4. Count of Events against Event Owners
        const eventsByOwnerQuery = `
            SELECT o.owner_name, COUNT(e.id) as event_count
            FROM event e
            JOIN owner o ON e.owner_id = o.id
            LEFT JOIN event_category ec ON e.event_category_id = ec.id
            ${whereString}
            GROUP BY o.owner_name
            ORDER BY event_count DESC
        `;

        // 5. Participation stats from every school
        const participationBySchoolQuery = `
            WITH FilteredEvents AS (
                SELECT e.id
                FROM event e
                LEFT JOIN event_category ec ON e.event_category_id = ec.id
                ${whereString}
            )
            SELECT s.school_name, COUNT(DISTINCT sp.id) as participant_count
            FROM school s
            JOIN student_profile sp ON s.id = sp.school_id
            LEFT JOIN registration r ON sp.id = r.student_profile_id AND r.is_deleted = false AND r.event_id IN (SELECT id FROM FilteredEvents)
            LEFT JOIN team_member tm ON sp.id = tm.student_profile_id AND tm.is_deleted = false
            LEFT JOIN team t ON tm.team_id = t.id AND t.is_deleted = false AND t.event_id IN (SELECT id FROM FilteredEvents)
            WHERE r.event_id IS NOT NULL OR t.event_id IS NOT NULL
            GROUP BY s.school_name
            ORDER BY participant_count DESC
        `;

        // 6. Podium position for every school
        const podiumsBySchoolQuery = `
            WITH FilteredEvents AS (
                SELECT e.id
                FROM event e
                LEFT JOIN event_category ec ON e.event_category_id = ec.id
                ${whereString}
            )
            SELECT s.school_name, COUNT(DISTINCT res.id) as podium_count
            FROM school s
            JOIN student_profile sp ON s.id = sp.school_id
            LEFT JOIN result_recipient rr_ind ON sp.id = rr_ind.student_profile_id AND rr_ind.is_deleted = false
            LEFT JOIN team_member tm ON sp.id = tm.student_profile_id AND tm.is_deleted = false
            LEFT JOIN result_recipient rr_team ON tm.team_id = rr_team.team_id AND rr_team.is_deleted = false
            JOIN result res ON res.id = COALESCE(rr_ind.result_id, rr_team.result_id) AND res.is_deleted = false
            WHERE res.event_id IN (SELECT id FROM FilteredEvents)
            GROUP BY s.school_name
            ORDER BY podium_count DESC
        `;

        // Execute all queries concurrently
        const [
            metricsRes,
            eventsTrendRes,
            participationTrendRes,
            eventsByOwnerRes,
            participationBySchoolRes,
            podiumsBySchoolRes
        ] = await Promise.all([
            db.query(metricsQuery, values),
            db.query(eventsTrendQuery, values),
            db.query(participationTrendQuery, values),
            db.query(eventsByOwnerQuery, values),
            db.query(participationBySchoolQuery, values),
            db.query(podiumsBySchoolQuery, values)
        ]);

        const metricsRow = metricsRes.rows[0];
        const totalEvents = parseInt(metricsRow.total_events, 10) || 0;
        const totalParticipants = parseInt(metricsRow.total_participants, 10) || 0;
        
        res.status(200).json({
            metrics: {
                totalEvents,
                totalParticipants,
                averageParticipants: totalEvents > 0 ? Math.round(totalParticipants / totalEvents) : 0,
                uniqueSchools: parseInt(metricsRow.unique_schools, 10) || 0
            },
            monthlyEventsTrend: eventsTrendRes.rows.map(r => ({ month: r.month, count: parseInt(r.event_count, 10) })),
            monthlyParticipationTrend: participationTrendRes.rows.map(r => ({ month: r.month, count: parseInt(r.participant_count, 10) })),
            eventsByOwner: eventsByOwnerRes.rows.map(r => ({ name: r.owner_name, count: parseInt(r.event_count, 10) })),
            participationBySchool: participationBySchoolRes.rows.map(r => ({ name: r.school_name, count: parseInt(r.participant_count, 10) })),
            podiumsBySchool: podiumsBySchoolRes.rows.map(r => ({ name: r.school_name, count: parseInt(r.podium_count, 10) }))
        });

    } catch (error) {
        console.error('Error fetching organization stats:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

exports.getEventStats = async (req, res) => {
    try {
        const eventId = req.params.eventId;
        
        // 1. Fetch Basic Event Details
        const eventQuery = `
            SELECT id, event_name, event_end_date, participation_type
            FROM event
            WHERE id = $1 AND is_deleted = false
        `;
        const eventRes = await db.query(eventQuery, [eventId]);
        if (eventRes.rows.length === 0) {
            return res.status(404).json({ message: 'Event not found.' });
        }
        const event = eventRes.rows[0];

        // 2. Fetch Participation Count
        let participantCount = 0;
        if (event.participation_type === 'INDIVIDUAL') {
            const partQuery = `SELECT COUNT(*) FROM registration WHERE event_id = $1 AND is_deleted = false`;
            const partRes = await db.query(partQuery, [eventId]);
            participantCount = parseInt(partRes.rows[0].count, 10);
        } else {
            // Group event - count all distinct students in registered teams
            const partQuery = `
                SELECT COUNT(DISTINCT tm.student_profile_id)
                FROM team t
                JOIN team_member tm ON t.id = tm.team_id
                WHERE t.event_id = $1 AND t.is_deleted = false AND tm.is_deleted = false
            `;
            const partRes = await db.query(partQuery, [eventId]);
            participantCount = parseInt(partRes.rows[0].count, 10);
        }

        // 3. Fetch Podiums
        const podiumQuery = `
            SELECT res.position_name, res.position_rank, 
                   COALESCE(u.name, t.team_name) as recipient_name,
                   s.school_name
            FROM result res
            JOIN result_recipient rr ON res.id = rr.result_id AND rr.is_deleted = false
            LEFT JOIN student_profile sp ON rr.student_profile_id = sp.id
            LEFT JOIN users u ON sp.user_id = u.id
            LEFT JOIN school s ON sp.school_id = s.id
            LEFT JOIN team t ON rr.team_id = t.id
            WHERE res.event_id = $1 AND res.is_deleted = false
            ORDER BY res.position_rank ASC
        `;
        const podiumRes = await db.query(podiumQuery, [eventId]);

        res.status(200).json({
            event,
            participantCount,
            podiums: podiumRes.rows
        });
    } catch (error) {
        console.error('Error fetching event stats:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};