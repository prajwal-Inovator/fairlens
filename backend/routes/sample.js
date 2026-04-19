const express = require('express');
const { getSampleColumns, sampleAnalysis, getSampleExplanation, mitigateSample } = require('../utils/pythonBridge');
const router = express.Router();

router.get('/:name/columns', async (req, res) => {
    try {
        const columns = await getSampleColumns(req.params.name);
        res.json({ columns });
    } catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message });
    }
});

router.get('/:name/analyze', async (req, res) => {
    try {
        const { targetCol, sensitiveCol } = req.query;
        if (!targetCol || !sensitiveCol) {
             return res.status(400).json({ error: 'Missing required query params: targetCol, sensitiveCol' });
        }
        const result = await sampleAnalysis(req.params.name, targetCol, sensitiveCol);
        res.json(result);
    } catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message });
    }
});

router.get('/:name/explain', async (req, res) => {
    try {
        const { targetCol, sensitiveCol } = req.query;
        if (!targetCol || !sensitiveCol) {
             return res.status(400).json({ error: 'Missing required query params: targetCol, sensitiveCol' });
        }
        const result = await getSampleExplanation(req.params.name, targetCol, sensitiveCol);
        res.json(result);
    } catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message });
    }
});

router.get('/:name/mitigate', async (req, res) => {
    try {
        const { targetCol, sensitiveCol } = req.query;
        if (!targetCol || !sensitiveCol) {
             return res.status(400).json({ error: 'Missing required query params: targetCol, sensitiveCol' });
        }
        const result = await mitigateSample(req.params.name, targetCol, sensitiveCol);
        res.json(result);
    } catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message });
    }
});

module.exports = router;
