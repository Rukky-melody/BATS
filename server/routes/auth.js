const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/connection');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'bats_default_secret';

/**
 * POST /api/auth/register
 * Register a new student
 */
router.post('/register', (req, res) => {
    try {
        const {
            matric_no, first_name, last_name, email, password,
            gender, level, department, faculty, phone, state_of_origin
        } = req.body;

        // Validation
        if (!matric_no || !first_name || !last_name || !email || !password || !gender || !level || !department) {
            return res.status(400).json({ error: 'All required fields must be provided.' });
        }

        const db = getDb();

        // Check if student already exists
        const existing = db.prepare('SELECT id FROM students WHERE matric_no = ? OR email = ?').get(matric_no, email);
        if (existing) {
            return res.status(409).json({ error: 'A student with this matric number or email already exists.' });
        }

        // Hash password
        const hashedPassword = bcrypt.hashSync(password, 10);

        // Insert student
        const result = db.prepare(`
            INSERT INTO students (matric_no, first_name, last_name, email, password, gender, level, department, faculty, phone, state_of_origin)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(matric_no, first_name, last_name, email, hashedPassword, gender, level, department, faculty || null, phone || null, state_of_origin || null);

        // Generate token
        const token = jwt.sign(
            { id: result.lastInsertRowid, role: 'student', matric_no },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'Registration successful.',
            token,
            user: {
                id: result.lastInsertRowid,
                matric_no,
                first_name,
                last_name,
                email,
                role: 'student'
            }
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * POST /api/auth/login
 * Login for both students and admins
 */
router.post('/login', (req, res) => {
    try {
        const { identifier, password, role } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({ error: 'Identifier and password are required.' });
        }

        const db = getDb();
        let user;
        let userRole;

        if (role === 'admin') {
            // Admin login by username
            user = db.prepare('SELECT * FROM admins WHERE username = ? OR email = ?').get(identifier, identifier);
            userRole = user ? user.role : null;
        } else {
            // Student login by matric_no or email
            user = db.prepare('SELECT * FROM students WHERE matric_no = ? OR email = ?').get(identifier, identifier);
            userRole = 'student';
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        // Verify password
        const validPassword = bcrypt.compareSync(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        // Generate token
        const tokenPayload = role === 'admin'
            ? { id: user.id, role: userRole, username: user.username }
            : { id: user.id, role: 'student', matric_no: user.matric_no };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

        // Build response user object (exclude password)
        const { password: _, ...userWithoutPassword } = user;

        res.json({
            message: 'Login successful.',
            token,
            user: { ...userWithoutPassword, role: userRole }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

module.exports = router;
