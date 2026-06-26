// backend/src/controllers/fileController.js
const db = require('../configs/db');
const { logAction } = require('../utils/auditLogger');
const fs = require('fs-extra'); // Or standard 'fs'
const path = require('path');

// POST: UPLOAD FILE
exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file binary detected in multi-part payload.' });
        }

        const { originalname, mimetype, filename, path: storagePath } = req.file;
        const userId = req.user.userId;

        const query = `
      INSERT INTO file_store (file_name, file_type, storage_path, uploaded_by_user_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, file_name, file_type, created_at
    `;
        const result = await db.query(query, [originalname, mimetype, storagePath, userId]);
        const fileRecord = result.rows[0];

        await logAction({
            userId: userId,
            action: 'UPLOAD_FILE',
            entityName: 'file_store',
            entityId: fileRecord.id,
            newValue: { file_name: originalname, file_type: mimetype, storage_path: storagePath }
        });

        res.status(201).json({ message: 'File saved successfully.', file: fileRecord });
    } catch (error) {
        console.error(' Upload File Error:', error);
        res.status(500).json({ message: 'Server error processing file write.' });
    }
};

// GET: RETRIEVE/DOWNLOAD FILE BY ID (Open to authenticated platform users)
exports.getFileById = async (req, res) => {
    const fileId = req.params.id;
    try {
        const query = `SELECT * FROM file_store WHERE id = $1 AND is_deleted = false`;
        const result = await db.query(query, [fileId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Requested asset file not found.' });
        }

        const fileRecord = result.rows[0];
        const absolutePath = path.resolve(fileRecord.storage_path);

        // Stream download file payload safely back to client browser context
        res.status(200).sendFile(absolutePath);
    } catch (error) {
        console.error('Get File Error:', error);
        res.status(500).json({ message: 'Server error pulling file asset streams.' });
    }
};

// DELETE: SOFT-DELETE FILE (Enforces creator, coordinator, or admin rights)
exports.deleteFile = async (req, res) => {
    const fileId = req.params.id;
    const { userId, role } = req.user;

    try {
        // 1. Pull the target file data to evaluate ownership structures
        const fileCheck = await db.query('SELECT * FROM file_store WHERE id = $1 AND is_deleted = false', [fileId]);
        if (fileCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Target file not found or already deleted.' });
        }
        const targetFile = fileCheck.rows[0];

        // 2. Authorization Verification Rule Strategy
        if (role !== 'ADMIN') {
            const authQuery = `
        SELECT e.id FROM event e
        LEFT JOIN staff_profile sp ON e.created_by_staff_id = sp.id
        LEFT JOIN coordinator_assignment ca ON e.id = ca.event_id AND ca.is_deleted = false
        WHERE (e.poster_file_id = $1 OR e.details_pdf_file_id = $1) AND e.is_deleted = false
          AND (sp.user_id = $2 OR ca.user_id = $3)
        LIMIT 1
      `;
            const authResult = await db.query(authQuery, [fileId, userId, userId]);

            // If the file is unlinked, allow the original creator to dump it. Otherwise, enforce event associations.
            const isOriginalUploader = targetFile.uploaded_by_user_id === userId;
            if (!isOriginalUploader && authResult.rows.length === 0) {
                return res.status(403).json({ message: 'Access Forbidden: You are not authorized to delete this file.' });
            }
        }

        // 3. Complete structural soft-delete operation
        const query = `
      UPDATE file_store 
      SET is_deleted = true, deleted_at = NOW(), deleted_by = $1 
      WHERE id = $2 
      RETURNING id, file_name
    `;
        await db.query(query, [userId, fileId]);

        await logAction({
            userId: userId,
            action: 'SOFT_DELETE_FILE',
            entityName: 'file_store',
            entityId: fileId,
            oldValue: { file_name: targetFile.file_name, storage_path: targetFile.storage_path }
        });

        res.status(200).json({ message: 'Asset file soft-deleted successfully.' });
    } catch (error) {
        console.error('Delete File Error:', error);
        res.status(500).json({ message: 'Server error handling file asset removal.' });
    }
};