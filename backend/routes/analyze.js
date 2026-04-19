

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { analyze } = require('../utils/pythonBridge');

const router = express.Router();

// ------------------------------------------------------------------
// MULTER CONFIGURATION (reused from upload.js, but defined locally)
// ------------------------------------------------------------------
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempDir = process.env.TEMP_DIR || '/tmp';
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `fairlens-${uniqueSuffix}.csv`);
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

// ------------------------------------------------------------------
// HELPER: Clean up temporary file
// ------------------------------------------------------------------
const cleanupFile = (filePath) => {
    if (filePath && fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
            if (err) console.error(`Failed to delete temp file ${filePath}:`, err);
        });
    }
};

// ------------------------------------------------------------------
// ROUTE: POST /api/analyze
// ------------------------------------------------------------------
/**
 * Run bias analysis on uploaded CSV.
 * Expected form fields:
 *   - file: CSV file (required)
 *   - targetCol: name of target column (required)
 *   - sensitiveCol: name of sensitive attribute column (required)
 * 
 * Response: bias analysis JSON (see bias_detector.py output schema)
 */
router.post('/analyze', (req, res, next) => {
    upload.single('file')(req, res, async (err) => {
        let tempFilePath = null;

        try {
            // Handle multer errors
            if (err) {
                if (err instanceof multer.MulterError) {
                    if (err.code === 'FILE_TOO_LARGE') {
                        return res.status(413).json({ error: 'File too large. Max 100MB.' });
                    }
                    return res.status(400).json({ error: err.message });
                }
                return res.status(400).json({ error: err.message });
            }

            // Validate file presence
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            // Validate required form fields
            const { targetCol, sensitiveCol } = req.body;
            if (!targetCol || !sensitiveCol) {
                cleanupFile(req.file.path);
                return res.status(400).json({ error: 'Missing required fields: targetCol, sensitiveCol' });
            }

            tempFilePath = req.file.path;

            // Call Python bridge to run bias analysis
            const analysisResult = await analyze(tempFilePath, targetCol, sensitiveCol);

            // Send response back to frontend
            res.json(analysisResult);

        } catch (error) {
            console.error('Error in /api/analyze:', error);
            const statusCode = error.statusCode || 500;
            res.status(statusCode).json({ error: error.message || 'Bias analysis failed' });
        } finally {
            // Always clean up the temporary CSV file
            if (tempFilePath) {
                cleanupFile(tempFilePath);
            }
        }
    });
});

module.exports = router;