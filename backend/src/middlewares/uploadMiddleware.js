const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'poster') {
        // Event poster validation (JPEG/PNG)
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type for poster. Only JPEG and PNG are allowed.'), false);
        }
    } else if (file.fieldname === 'pdf') {
        // Rule book / details PDF validation
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type for details. Only PDF files are allowed.'), false);
        }
    } else {
        cb(new Error('Unexpected file field.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB structural cap
});

// Export a specialized middleware handler for the Event Assets
exports.uploadEventAssets = upload.fields([
    { name: 'poster', maxCount: 1 },
    { name: 'pdf', maxCount: 1 }
]);