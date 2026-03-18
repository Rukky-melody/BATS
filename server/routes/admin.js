const express = require('express');
const { getDb } = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');
const { runAllocation } = require('../services/allocation');

const router = express.Router();

// All routes require admin authentication
router.use(authenticate, authorize('admin', 'super_admin'));

/**
 * GET /api/admin/stats
 * Dashboard statistics
 */
router.get('/stats', (req, res) => {
    try {
        const db = getDb();

        const totalStudents = db.prepare('SELECT COUNT(*) as count FROM students').get().count;
        const totalHostels = db.prepare('SELECT COUNT(*) as count FROM hostels').get().count;
        const totalBeds = db.prepare('SELECT COUNT(*) as count FROM bed_spaces').get().count;
        const availableBeds = db.prepare("SELECT COUNT(*) as count FROM bed_spaces WHERE status = 'available'").get().count;
        const occupiedBeds = db.prepare("SELECT COUNT(*) as count FROM bed_spaces WHERE status = 'occupied'").get().count;
        const pendingApps = db.prepare("SELECT COUNT(*) as count FROM applications WHERE application_status = 'pending'").get().count;
        const approvedApps = db.prepare("SELECT COUNT(*) as count FROM applications WHERE application_status = 'approved'").get().count;
        const allocatedApps = db.prepare("SELECT COUNT(*) as count FROM applications WHERE application_status = 'allocated'").get().count;

        res.json({
            students: totalStudents,
            hostels: totalHostels,
            bed_spaces: { total: totalBeds, available: availableBeds, occupied: occupiedBeds },
            applications: { pending: pendingApps, approved: approvedApps, allocated: allocatedApps },
            occupancy_rate: totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(1) : 0
        });
    } catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * GET /api/admin/hostels
 * List all hostels with blocks, rooms, and bed space counts
 */
router.get('/hostels', (req, res) => {
    try {
        const db = getDb();
        const hostels = db.prepare(`
            SELECT 
                h.id, h.name, h.gender, h.description,
                COUNT(DISTINCT b.id) as total_blocks,
                COUNT(DISTINCT r.id) as total_rooms,
                COUNT(DISTINCT bs.id) as total_beds,
                COUNT(DISTINCT CASE WHEN bs.status = 'available' THEN bs.id END) as available_beds
            FROM hostels h
            LEFT JOIN blocks b ON b.hostel_id = h.id
            LEFT JOIN rooms r ON r.block_id = b.id
            LEFT JOIN bed_spaces bs ON bs.room_id = r.id
            GROUP BY h.id
        `).all();

        res.json({ hostels });
    } catch (err) {
        console.error('Hostels list error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * POST /api/admin/hostels
 * Create a new hostel
 */
router.post('/hostels', (req, res) => {
    try {
        const { name, gender, description } = req.body;

        if (!name || !gender) {
            return res.status(400).json({ error: 'Hostel name and gender are required.' });
        }

        const db = getDb();
        const result = db.prepare(
            'INSERT INTO hostels (name, gender, description) VALUES (?, ?, ?)'
        ).run(name, gender, description || null);

        res.status(201).json({
            message: 'Hostel created successfully.',
            hostel: { id: result.lastInsertRowid, name, gender, description }
        });
    } catch (err) {
        console.error('Hostel creation error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * POST /api/admin/blocks
 * Create a new block in a hostel
 */
router.post('/blocks', (req, res) => {
    try {
        const { hostel_id, block_name, floor_count } = req.body;

        if (!hostel_id || !block_name) {
            return res.status(400).json({ error: 'Hostel ID and block name are required.' });
        }

        const db = getDb();
        const result = db.prepare(
            'INSERT INTO blocks (hostel_id, block_name, floor_count) VALUES (?, ?, ?)'
        ).run(hostel_id, block_name, floor_count || 1);

        res.status(201).json({
            message: 'Block created successfully.',
            block: { id: result.lastInsertRowid, hostel_id, block_name, floor_count }
        });
    } catch (err) {
        console.error('Block creation error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * POST /api/admin/rooms
 * Create a room with bed spaces
 */
router.post('/rooms', (req, res) => {
    try {
        const { block_id, room_number, floor, capacity, room_type } = req.body;

        if (!block_id || !room_number) {
            return res.status(400).json({ error: 'Block ID and room number are required.' });
        }

        const db = getDb();
        const roomCapacity = capacity || 4;

        const createRoomWithBeds = db.transaction(() => {
            const roomResult = db.prepare(
                'INSERT INTO rooms (block_id, room_number, floor, capacity, room_type) VALUES (?, ?, ?, ?, ?)'
            ).run(block_id, room_number, floor || 1, roomCapacity, room_type || 'regular');

            // Auto-create bed spaces based on capacity
            const insertBed = db.prepare('INSERT INTO bed_spaces (room_id, bed_number, status) VALUES (?, ?, ?)');
            for (let i = 1; i <= roomCapacity; i++) {
                insertBed.run(roomResult.lastInsertRowid, `Bed ${i}`, 'available');
            }

            return roomResult.lastInsertRowid;
        });

        const roomId = createRoomWithBeds();

        res.status(201).json({
            message: `Room created with ${roomCapacity} bed spaces.`,
            room: { id: roomId, block_id, room_number, capacity: roomCapacity }
        });
    } catch (err) {
        console.error('Room creation error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * GET /api/admin/applications
 * List all applications with student details
 */
router.get('/applications', (req, res) => {
    try {
        const { session, status } = req.query;
        const db = getDb();

        let query = `
            SELECT 
                a.id, a.session, a.payment_status, a.application_status, a.priority_score, a.applied_at,
                s.matric_no, s.first_name, s.last_name, s.gender, s.level, s.department,
                h.name as hostel_preference
            FROM applications a
            JOIN students s ON a.student_id = s.id
            LEFT JOIN hostels h ON a.hostel_preference_id = h.id
        `;

        const conditions = [];
        const params = [];

        if (session) {
            conditions.push('a.session = ?');
            params.push(session);
        }
        if (status) {
            conditions.push('a.application_status = ?');
            params.push(status);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY a.applied_at DESC';

        const applications = db.prepare(query).all(...params);
        res.json({ applications });
    } catch (err) {
        console.error('Applications list error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * POST /api/admin/allocate
 * Trigger the allocation algorithm for a session
 */
router.post('/allocate', (req, res) => {
    try {
        const { session } = req.body;

        if (!session) {
            return res.status(400).json({ error: 'Academic session is required.' });
        }

        const result = runAllocation(session);
        res.json(result);
    } catch (err) {
        console.error('Allocation error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * GET /api/admin/allocations
 * View all allocations with full details
 */
router.get('/allocations', (req, res) => {
    try {
        const { session } = req.query;
        const db = getDb();

        let query = `
            SELECT 
                al.id, al.session, al.allocated_at, al.status,
                s.matric_no, s.first_name, s.last_name, s.gender, s.level,
                bs.bed_number,
                r.room_number, r.floor,
                b.block_name,
                h.name as hostel_name
            FROM allocations al
            JOIN students s ON al.student_id = s.id
            JOIN bed_spaces bs ON al.bed_space_id = bs.id
            JOIN rooms r ON bs.room_id = r.id
            JOIN blocks b ON r.block_id = b.id
            JOIN hostels h ON b.hostel_id = h.id
        `;

        const params = [];
        if (session) {
            query += ' WHERE al.session = ?';
            params.push(session);
        }

        query += ' ORDER BY al.allocated_at DESC';

        const allocations = db.prepare(query).all(...params);
        res.json({ allocations });
    } catch (err) {
        console.error('Allocations list error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

module.exports = router;
