const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// ------------------------------------------------------------------
// ROUTE IMPORTS
// ------------------------------------------------------------------
const uploadRoutes = require('./routes/upload');
const analyzeRoutes = require('./routes/analyze');
const resultsRoutes = require('./routes/results');
const explainRoutes = require('./routes/explain');
const mitigateRoutes = require('./routes/mitigate');
const sampleRoutes = require('./routes/sample');

// ------------------------------------------------------------------
// INITIALIZATION
// ------------------------------------------------------------------
const app = express();   // ✅ MUST COME BEFORE app.use()
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ------------------------------------------------------------------
// MIDDLEWARE
// ------------------------------------------------------------------
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://fairlens-frontend.onrender.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

if (NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ------------------------------------------------------------------
// CREATE TEMP DIRECTORY
// ------------------------------------------------------------------
const tempDir = process.env.TEMP_DIR || '/tmp/fairlens_uploads';
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}
process.env.TEMP_DIR = tempDir;

// ------------------------------------------------------------------
// HEALTH CHECK
// ------------------------------------------------------------------
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// ------------------------------------------------------------------
// ROUTES (VERY IMPORTANT)
// ------------------------------------------------------------------
app.use('/api', uploadRoutes);
app.use('/api', analyzeRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api', explainRoutes);
app.use('/api', mitigateRoutes);

// ✅ FIXED SAMPLE ROUTE
app.use('/api', sampleRoutes);

// ------------------------------------------------------------------
// 404 HANDLER
// ------------------------------------------------------------------
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

// ------------------------------------------------------------------
// ERROR HANDLER
// ------------------------------------------------------------------
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.statusCode || 500).json({ error: err.message });
});

// ------------------------------------------------------------------
// START SERVER
// ------------------------------------------------------------------
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;