const express = require('express');
const { getDb } = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require student authentication
router.use(authenticate, authorize('student'));

/**
 * GET /api/students/profile
 * Get current student's profile
 */
router.get('/profile', (req, res) => {
    try {
        const db = getDb();
        const student = db.prepare(
            'SELECT id, matric_no, first_name, last_name, email, gender, level, department, faculty, phone, state_of_origin, disability_status, created_at FROM students WHERE id = ?'
        ).get(req.user.id);

        if (!student) {
            return res.status(404).json({ error: 'Student not found.' });
        }

        res.json({ student });
    } catch (err) {
        console.error('Profile fetch error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * PUT /api/students/profile
 * Update current student's profile
 */
router.put('/profile', (req, res) => {
    try {
        const { phone, state_of_origin, disability_status } = req.body;
        const db = getDb();

        db.prepare(`
            UPDATE students 
            SET phone = COALESCE(?, phone),
                state_of_origin = COALESCE(?, state_of_origin),
                disability_status = COALESCE(?, disability_status),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(phone, state_of_origin, disability_status, req.user.id);

        const updated = db.prepare(
            'SELECT id, matric_no, first_name, last_name, email, gender, level, department, faculty, phone, state_of_origin, disability_status FROM students WHERE id = ?'
        ).get(req.user.id);

        res.json({ message: 'Profile updated successfully.', student: updated });
    } catch (err) {
        console.error('Profile update error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * POST /api/students/apply
 * Submit hostel accommodation application
 */
router.post('/apply', (req, res) => {
    try {
        const { session, hostel_preference_id } = req.body;

        if (!session) {
            return res.status(400).json({ error: 'Academic session is required.' });
        }

        const db = getDb();

        // Check for existing application in same session
        const existing = db.prepare(
            'SELECT id FROM applications WHERE student_id = ? AND session = ? AND application_status NOT IN (?, ?)'
        ).get(req.user.id, session, 'rejected', 'cancelled');

        if (existing) {
            return res.status(409).json({ error: 'You already have an active application for this session.' });
        }

        // Calculate priority score
        const student = db.prepare('SELECT level, disability_status FROM students WHERE id = ?').get(req.user.id);
        let priorityScore = 0;
        if (student.level === 500) priorityScore += 30;
        else if (student.level === 400) priorityScore += 20;
        else if (student.level === 300) priorityScore += 10;
        if (student.disability_status) priorityScore += 50;

        const result = db.prepare(`
            INSERT INTO applications (student_id, session, hostel_preference_id, priority_score)
            VALUES (?, ?, ?, ?)
        `).run(req.user.id, session, hostel_preference_id || null, priorityScore);

        res.status(201).json({
            message: 'Application submitted successfully.',
            application: {
                id: result.lastInsertRowid,
                session,
                payment_status: 'unpaid',
                application_status: 'pending',
                priority_score: priorityScore
            }
        });
    } catch (err) {
        console.error('Application error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * GET /api/students/application-status
 * Check student's application and allocation status
 */
router.get('/application-status', (req, res) => {
    try {
        const db = getDb();
        const applications = db.prepare(`
            SELECT 
                a.id, a.session, a.payment_status, a.application_status, a.priority_score, a.applied_at,
                h.name as hostel_preference
            FROM applications a
            LEFT JOIN hostels h ON a.hostel_preference_id = h.id
            WHERE a.student_id = ?
            ORDER BY a.applied_at DESC
        `).all(req.user.id);

        // Get allocation details if any
        const allocations = db.prepare(`
            SELECT 
                al.id, al.session, al.allocated_at, al.status,
                bs.bed_number,
                r.room_number, r.floor,
                b.block_name,
                h.name as hostel_name
            FROM allocations al
            JOIN bed_spaces bs ON al.bed_space_id = bs.id
            JOIN rooms r ON bs.room_id = r.id
            JOIN blocks b ON r.block_id = b.id
            JOIN hostels h ON b.hostel_id = h.id
            WHERE al.student_id = ?
            ORDER BY al.allocated_at DESC
        `).all(req.user.id);

        res.json({ applications, allocations });
    } catch (err) {
        console.error('Status check error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * POST /api/students/simulate-payment
 * Simulate payment for an application (placeholder for Paystack)
 */
router.post('/simulate-payment', (req, res) => {
    try {
        const { application_id } = req.body;
        const db = getDb();

        const application = db.prepare(
            'SELECT * FROM applications WHERE id = ? AND student_id = ?'
        ).get(application_id, req.user.id);

        if (!application) {
            return res.status(404).json({ error: 'Application not found.' });
        }

        if (application.payment_status === 'paid' || application.payment_status === 'verified') {
            return res.status(400).json({ error: 'Payment already processed.' });
        }

        // Simulate payment — generate a fake reference
        const paymentRef = `SIM-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        db.prepare(`
            UPDATE applications 
            SET payment_status = 'paid', 
                payment_reference = ?,
                application_status = 'approved',
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `).run(paymentRef, application_id);

        res.json({
            message: 'Payment simulated successfully. Application approved.',
            payment_reference: paymentRef
        });
    } catch (err) {
        console.error('Payment simulation error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

module.exports = router;
