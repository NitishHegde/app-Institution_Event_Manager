// backend/src/routes/fileRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fileController = require('../controllers/fileController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

// Ensure upload tracking directory workspace exists safely
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Storage Engine Layout Logic
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

// Structural filter configurations (accepting image formats or details PDFs)
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid format type restriction parameter mismatch. Only JPEGs, PNGs, and PDFs are supported.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// POST: Upload single file (Open to all system manager variants)
router.post(
    '/files/upload',
    authenticateToken,
    authorizeRoles('ADMIN', 'STAFF', 'STUDENT'),
    upload.single('file'),
    fileController.uploadFile
);

// GET: View or Download File assets
router.get('/files/:id', authenticateToken, fileController.getFileById);

// DELETE: Perform contextual soft-deletion verification sweeps
router.delete('/files/:id', authenticateToken, authorizeRoles('ADMIN', 'STAFF', 'STUDENT'), fileController.deleteFile);

module.exports = router;