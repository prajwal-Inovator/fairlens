

const express = require('express');
const crypto = require('crypto');

const router = express.Router();

// ------------------------------------------------------------------
// IN-MEMORY STORAGE
// ------------------------------------------------------------------
// Simple Map to store analysis results. In production, replace with
// a database (PostgreSQL, MongoDB, or Redis).
const resultStore = new Map();

// Optional: Maximum number of stored results (to prevent memory exhaustion)
const MAX_STORED_RESULTS = 100;

// ------------------------------------------------------------------
// HELPER: Generate unique ID
// ------------------------------------------------------------------
const generateId = () => {
    return crypto.randomUUID();
};

// ------------------------------------------------------------------
// HELPER: Clean up old results if store exceeds limit
// ------------------------------------------------------------------
const cleanupIfNeeded = () => {
    if (resultStore.size > MAX_STORED_RESULTS) {
        // Delete the oldest entry (Map iterates in insertion order)
        const oldestKey = resultStore.keys().next().value;
        resultStore.delete(oldestKey);
    }
};

// ------------------------------------------------------------------
// ROUTE: POST /api/results
// ------------------------------------------------------------------
/**
 * Store an analysis result.
 * Request body should contain the full bias analysis JSON
 * (as returned by /api/analyze or /api/sample/:name/analyze).
 * Optionally include metadata like dataset name, targetCol, sensitiveCol.
 * 
 * Response: { id: string, timestamp: string }
 */
router.post('/', (req, res) => {
    try {
        const { result, metadata = {} } = req.body;

        if (!result) {
            return res.status(400).json({ error: 'Missing required field: result' });
        }

        // Validate that result has expected fields (basic check)
        if (typeof result !== 'object') {
            return res.status(400).json({ error: 'result must be an object' });
        }

        const id = generateId();
        const timestamp = new Date().toISOString();

        resultStore.set(id, {
            result,
            metadata: {
                ...metadata,
                timestamp
            },
            createdAt: timestamp
        });

        cleanupIfNeeded();

        res.status(201).json({ id, timestamp });

    } catch (error) {
        console.error('Error storing result:', error);
        res.status(500).json({ error: 'Failed to store result' });
    }
});

// ------------------------------------------------------------------
// ROUTE: GET /api/results/:id
// ------------------------------------------------------------------
/**
 * Retrieve a stored analysis result by ID.
 * Response: { result, metadata, createdAt }
 */
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;

        if (!resultStore.has(id)) {
            return res.status(404).json({ error: 'Result not found' });
        }

        const stored = resultStore.get(id);
        res.json({
            id,
            result: stored.result,
            metadata: stored.metadata,
            createdAt: stored.createdAt
        });

    } catch (error) {
        console.error('Error retrieving result:', error);
        res.status(500).json({ error: 'Failed to retrieve result' });
    }
});

// ------------------------------------------------------------------
// ROUTE: GET /api/results (optional, list all IDs)
// ------------------------------------------------------------------
/**
 * List all stored result IDs (for debugging or admin purposes).
 * Response: { ids: string[], count: number }
 */
router.get('/', (req, res) => {
    try {
        const ids = Array.from(resultStore.keys());
        res.json({ ids, count: ids.length });
    } catch (error) {
        console.error('Error listing results:', error);
        res.status(500).json({ error: 'Failed to list results' });
    }
});

// ------------------------------------------------------------------
// ROUTE: DELETE /api/results/:id
// ------------------------------------------------------------------
/**
 * Delete a stored result.
 * Response: { success: true }
 */
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;

        if (!resultStore.has(id)) {
            return res.status(404).json({ error: 'Result not found' });
        }

        resultStore.delete(id);
        res.json({ success: true });

    } catch (error) {
        console.error('Error deleting result:', error);
        res.status(500).json({ error: 'Failed to delete result' });
    }
});

module.exports = router;