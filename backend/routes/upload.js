

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getColumns } = require('../utils/pythonBridge');

const router = express.Router();

// ------------------------------------------------------------------
// MULTER CONFIGURATION (temporary storage)
// ------------------------------------------------------------------
// Configure multer to store files in OS temp directory with unique names.
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempDir = process.env.TEMP_DIR || '/tmp';
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        // Create unique filename: timestamp-random.csv
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `fairlens-${uniqueSuffix}.csv`);
    }
});

// File filter: only allow CSV files
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
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// ------------------------------------------------------------------
// HELPER: Clean up temporary file
// ------------------------------------------------------------------
/**
 * Safely delete a file if it exists.
 * @param {string} filePath - Path to the file to delete.
 */
const cleanupFile = (filePath) => {
    if (filePath && fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
            if (err) console.error(`Failed to delete temp file ${filePath}:`, err);
        });
    }
};

// ------------------------------------------------------------------
// ROUTE: POST /api/columns
// ------------------------------------------------------------------
/**
 * Upload a CSV file and return its column names.
 * Expects multipart/form-data with field name 'file'.
 * Response: { columns: string[] }
 */
router.post('/columns', (req, res, next) => {
    // Use multer single file upload
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

            // Check if file was uploaded
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            tempFilePath = req.file.path;

            // Call Python bridge to get columns
            const columns = await getColumns(tempFilePath);

            // Send response
            res.json({ columns });

        } catch (error) {
            console.error('Error in /api/columns:', error);
            // Forward error from Python bridge
            const statusCode = error.statusCode || 500;
            res.status(statusCode).json({ error: error.message || 'Failed to read CSV columns' });
        } finally {
            // Clean up temp file after response (or after error)
            if (tempFilePath) {
                cleanupFile(tempFilePath);
            }
        }
    });
});

// ------------------------------------------------------------------
// ROUTE: POST /api/validate (optional)
// ------------------------------------------------------------------
/**
 * Validate CSV file structure without returning full analysis.
 * Checks: file presence, non-empty, valid CSV format.
 * Response: { valid: boolean, rows?: number, columns?: string[], error?: string }
 */
router.post('/validate', (req, res, next) => {
    upload.single('file')(req, res, async (err) => {
        let tempFilePath = null;

        try {
            if (err) {
                return res.status(400).json({ valid: false, error: err.message });
            }

            if (!req.file) {
                return res.status(400).json({ valid: false, error: 'No file uploaded' });
            }

            tempFilePath = req.file.path;

            // Use getColumns as a lightweight validation
            const columns = await getColumns(tempFilePath);

            // Optional: count rows (requires additional Python call, but we can rely on columns success)
            res.json({
                valid: true,
                columns: columns,
                message: 'CSV is valid'
            });

        } catch (error) {
            res.status(400).json({ valid: false, error: error.message });
        } finally {
            if (tempFilePath) cleanupFile(tempFilePath);
        }
    });
});

// ------------------------------------------------------------------
// EXPORT ROUTER
// ------------------------------------------------------------------
module.exports = router;