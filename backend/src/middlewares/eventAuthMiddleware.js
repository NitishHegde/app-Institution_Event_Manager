const db = require('../configs/db');

/**
 * Checks if the user is the absolute Creator (Owner) of the event or an ADMIN.
 * Required for modifying the coordinator assignment list.
 */
exports.requireEventOwner = async (req, res, next) => {
    let { eventId, id } = req.params; // Extract both just in case
    const { userId, role } = req.user;

    if (role === 'ADMIN') return next();

    try {
        // If eventId isn't explicitly in the URL parameters, resolve it from the coordinator assignment table
        if (!eventId && id) {
            const assignmentCheck = await db.query(
                'SELECT event_id FROM coordinator_assignment WHERE id = $1 AND is_deleted = false',
                [id]
            );
            if (assignmentCheck.rows.length === 0) {
                return res.status(404).json({ message: 'Assignment target entity mapping record mismatch.' });
            }
            eventId = assignmentCheck.rows[0].event_id;
        }

        // Look up the staff profile id for the authenticated user
        const staffCheck = await db.query('SELECT id FROM staff_profile WHERE user_id = $1 AND is_deleted = false', [userId]);
        if (staffCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Access Denied: Only faculty staff owners hold these administrative rights.' });
        }
        const staffProfileId = staffCheck.rows[0].id;

        // Verify if this staff member created the target event
        const eventCheck = await db.query(
            'SELECT id FROM event WHERE id = $1 AND created_by_staff_id = $2 AND is_deleted = false',
            [eventId, staffProfileId]
        );

        if (eventCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Access Forbidden: Only the primary faculty owner who created this event can modify management personnel.' });
        }

        next();
    } catch (error) {
        console.error('❌ Event Owner Guard Error:', error);
        res.status(500).json({ message: 'Internal server error evaluating asset relationship scopes.' });
    }
};