

const fs = require('fs');

/**
 * Custom error class for validation failures.
 */
class ValidationError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.name = 'ValidationError';
        this.statusCode = statusCode;
    }
}

/**
 * ------------------------------------------------------------------
 * Middleware: validateFile
 * ------------------------------------------------------------------
 * Checks that a file was uploaded, has a valid CSV MIME type or extension,
 * and does not exceed the size limit.
 * 
 * This middleware assumes multer has already processed the file and
 * attached it to req.file.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateFile = (req, res, next) => {
    try {
        // 1. Check if file exists
        if (!req.file) {
            throw new ValidationError('No file uploaded', 400);
        }

        const file = req.file;
        const maxSizeBytes = 100 * 1024 * 1024; // 100MB

        // 2. Check file size
        if (file.size > maxSizeBytes) {
            throw new ValidationError(`File too large. Maximum size is ${maxSizeBytes / (1024 * 1024)}MB`, 413);
        }

        // 3. Check MIME type or file extension
        const allowedMimeTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
        const isMimeValid = allowedMimeTypes.includes(file.mimetype);
        const isExtensionValid = file.originalname && file.originalname.toLowerCase().endsWith('.csv');

        if (!isMimeValid && !isExtensionValid) {
            throw new ValidationError('Invalid file type. Only CSV files are allowed.', 400);
        }

        // 4. Check that the file actually exists on disk (multer saved it)
        if (!fs.existsSync(file.path)) {
            throw new ValidationError('Uploaded file not found on server', 500);
        }

        // All checks passed
        next();
    } catch (error) {
        if (error instanceof ValidationError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        console.error('Unexpected error in fileValidator:', error);
        return res.status(500).json({ error: 'Internal server error during file validation' });
    }
};

/**
 * ------------------------------------------------------------------
 * Middleware: validateFileWithHeaders (optional)
 * ------------------------------------------------------------------
 * Extends validateFile and also validates that the CSV contains the
 * required columns (e.g., target column and sensitive column).
 * 
 * This version does NOT call Python; it reads the first line of the CSV
 * to parse headers synchronously. For large files, this is acceptable
 * because we only read the first few bytes.
 * 
 * @param {string[]} requiredColumns - Array of column names that must exist
 * @returns {Function} Express middleware function
 */
const validateFileWithHeaders = (requiredColumns = []) => {
    return (req, res, next) => {
        // First run basic file validation
        validateFile(req, res, (err) => {
            if (err) return;

            try {
                if (!req.file) {
                    throw new ValidationError('No file available for header validation', 400);
                }

                // Read first line of CSV to extract headers
                const filePath = req.file.path;
                const buffer = Buffer.alloc(4096); // Read first 4KB (enough for headers)
                const fd = fs.openSync(filePath, 'r');
                const bytesRead = fs.readSync(fd, buffer, 0, 4096, 0);
                fs.closeSync(fd);

                const firstChunk = buffer.toString('utf8', 0, bytesRead);
                const firstLine = firstChunk.split(/\r?\n/)[0];

                if (!firstLine) {
                    throw new ValidationError('CSV file is empty or malformed', 400);
                }

                // Parse CSV headers (simple split – assumes no quoted commas)
                const headers = firstLine.split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));

                if (headers.length === 0) {
                    throw new ValidationError('CSV has no columns', 400);
                }

                // Check for required columns
                const missing = requiredColumns.filter(col => !headers.includes(col));
                if (missing.length > 0) {
                    throw new ValidationError(`Missing required columns: ${missing.join(', ')}`, 400);
                }

                // Attach headers to req for downstream use
                req.validatedHeaders = headers;

                next();
            } catch (error) {
                if (error instanceof ValidationError) {
                    return res.status(error.statusCode).json({ error: error.message });
                }
                console.error('Error validating CSV headers:', error);
                return res.status(500).json({ error: 'Failed to validate CSV structure' });
            }
        });
    };
};


const validateColumnsWithPython = async (filePath, requiredColumns) => {
    const { getColumns } = require('../utils/pythonBridge');
    const columns = await getColumns(filePath);
    const missing = requiredColumns.filter(col => !columns.includes(col));
    if (missing.length > 0) {
        throw new ValidationError(`Missing required columns: ${missing.join(', ')}`, 400);
    }
    return columns;
};

module.exports = {
    validateFile,
    validateFileWithHeaders,
    ValidationError,
    validateColumnsWithPython
};