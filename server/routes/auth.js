const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Admin = require('../models/Admin');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'bats_default_secret';

/**
 * POST /api/auth/register
 * Register a new student
 */
router.post('/register', async (req, res) => {
    try {
        const {
            matric_no, first_name, last_name, email, password,
            gender, level, department, faculty, phone, state_of_origin
        } = req.body;

        if (!matric_no || !first_name || !last_name || !email || !password || !gender || !level || !department) {
            return res.status(400).json({ error: 'All required fields must be provided.' });
        }

        // Check if student already exists
        const existing = await Student.findOne({ $or: [{ matric_no }, { email }] });
        if (existing) {
            return res.status(409).json({ error: 'A student with this matric number or email already exists.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const student = await Student.create({
            matric_no, first_name, last_name, email,
            password: hashedPassword,
            gender, level: Number(level), department,
            faculty: faculty || null,
            phone: phone || null,
            state_of_origin: state_of_origin || null
        });

        // Generate token
        const token = jwt.sign(
            { id: student._id, role: 'student', matric_no },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'Registration successful.',
            token,
            user: {
                id: student._id,
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
router.post('/login', async (req, res) => {
    try {
        const { identifier, password, role } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({ error: 'Identifier and password are required.' });
        }

        let user;
        let userRole;

        if (role === 'admin') {
            user = await Admin.findOne({ $or: [{ username: identifier }, { email: identifier }] });
            userRole = user ? user.role : null;
        } else {
            user = await Student.findOne({ $or: [{ matric_no: identifier }, { email: identifier }] });
            userRole = 'student';
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const tokenPayload = role === 'admin'
            ? { id: user._id, role: userRole, username: user.username }
            : { id: user._id, role: 'student', matric_no: user.matric_no };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

        // Build response user object (exclude password)
        const userObj = user.toObject();
        delete userObj.password;

        res.json({
            message: 'Login successful.',
            token,
            user: { ...userObj, role: userRole }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

module.exports = router;
