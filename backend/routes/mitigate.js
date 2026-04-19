const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { mitigate } = require('../utils/pythonBridge');

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempDir = process.env.TEMP_DIR || '/tmp';
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `fairlens-mitigate-${uniqueSuffix}.csv`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        cb(null, true);
    } else {
        cb(new Error('Only CSV files are allowed'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

const cleanupFile = (filePath) => {
    if (filePath && fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
            if (err) console.error(`Failed to delete temp file ${filePath}:`, err);
        });
    }
};

router.post('/mitigate', (req, res, next) => {
    upload.single('file')(req, res, async (err) => {
        let tempFilePath = null;
        try {
            if (err) {
                if (err instanceof multer.MulterError && err.code === 'FILE_TOO_LARGE') {
                    return res.status(413).json({ error: 'File too large. Max 100MB.' });
                }
                return res.status(400).json({ error: err.message });
            }
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            const { targetCol, sensitiveCol } = req.body;
            if (!targetCol || !sensitiveCol) {
                cleanupFile(req.file.path);
                return res.status(400).json({ error: 'Missing required fields: targetCol, sensitiveCol' });
            }

            tempFilePath = req.file.path;
            const result = await mitigate(tempFilePath, targetCol, sensitiveCol);
            res.json(result);
        } catch (error) {
            console.error('Error in /api/mitigate:', error);
            const statusCode = error.statusCode || 500;
            res.status(statusCode).json({ error: error.message || 'Mitigation failed' });
        } finally {
            if (tempFilePath) cleanupFile(tempFilePath);
        }
    });
});

module.exports = router;
