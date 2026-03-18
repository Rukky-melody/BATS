const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ──────────────────────────────────────────
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        process.env.CLIENT_URL
    ].filter(Boolean),
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Request logging (dev) ──────────────────────────────
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} | ${req.method} ${req.url}`);
    next();
});

// ─── API Routes ─────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/admin', adminRoutes);

// ─── Health check ───────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'BATS API', timestamp: new Date().toISOString() });
});

// ─── 404 handler ────────────────────────────────────────
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
});

// ─── Global error handler ───────────────────────────────
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error.' });
});

// ─── Start server ───────────────────────────────────────
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║           🏠 BATS API Server                ║
║   Hostel Accommodation & Allocation System   ║
╠══════════════════════════════════════════════╣
║   Status:  Running                           ║
║   Port:    ${PORT}                              ║
║   URL:     http://localhost:${PORT}              ║
╚══════════════════════════════════════════════╝
    `);
});

module.exports = app;
