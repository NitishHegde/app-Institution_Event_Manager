// backend/src/utils/auditLogger.js
const db = require('../configs/db');

/**
 * Utility to write records safely into the audit_log table
 */
const logAction = async ({ userId, action, entityName, entityId, oldValue = null, newValue = null }) => {
    try {
        const query = `
      INSERT INTO audit_log (user_id, action, entity_name, entity_id, old_value, new_value)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
        await db.query(query, [
            userId,
            action,
            entityName,
            entityId,
            oldValue ? JSON.stringify(oldValue) : null,
            newValue ? JSON.stringify(newValue) : null
        ]);
    } catch (error) {
        // Log error locally but do not crash the main application thread if logging fails
        console.error('Failed to write into Audit Log:', error);
    }
};

module.exports = { logAction };