const express = require('express');
const Student = require('../models/Student');
const Hostel = require('../models/Hostel');
const Block = require('../models/Block');
const Room = require('../models/Room');
const BedSpace = require('../models/BedSpace');
const Application = require('../models/Application');
const Allocation = require('../models/Allocation');
const Admin = require('../models/Admin');
const { authenticate, authorize } = require('../middleware/auth');
const { runAllocation } = require('../services/allocation');

const router = express.Router();

// All routes require admin authentication
router.use(authenticate, authorize('admin', 'super_admin'));

/**
 * GET /api/admin/stats
 */
router.get('/stats', async (req, res) => {
    try {
        const filterHostel = req.user.role === 'admin' && req.user.assigned_gender !== 'all' 
            ? { gender: req.user.assigned_gender } : {};

        let appFilter = {};
        let studentFilter = {};
        
        if (req.user.role === 'admin' && req.user.assigned_gender !== 'all') {
            studentFilter = { gender: req.user.assigned_gender };
            const allowedStudents = await Student.find(studentFilter).select('_id').lean();
            appFilter.student = { $in: allowedStudents.map(s => s._id) };
        }

        const allowedHostels = await Hostel.find(filterHostel).select('_id').lean();
        const allowedBlocks = await Block.find({ hostel: { $in: allowedHostels.map(h => h._id) } }).select('_id').lean();
        const allowedRooms = await Room.find({ block: { $in: allowedBlocks.map(b => b._id) } }).select('_id').lean();
        const allowedRoomIds = allowedRooms.map(r => r._id);

        const bedFilter = allowedRoomIds.length > 0 ? { room: { $in: allowedRoomIds } } : { room: null }; 
        if (Object.keys(filterHostel).length === 0) delete bedFilter.room; // if no filter, don't restrict beds

        const [
            totalStudents, totalHostels, totalBeds,
            availableBeds, occupiedBeds,
            pendingApps, approvedApps, allocatedApps
        ] = await Promise.all([
            Student.countDocuments(studentFilter),
            Hostel.countDocuments(filterHostel),
            Object.keys(filterHostel).length === 0 ? BedSpace.countDocuments() : BedSpace.countDocuments(bedFilter),
            Object.keys(filterHostel).length === 0 ? BedSpace.countDocuments({ status: 'available' }) : BedSpace.countDocuments({ ...bedFilter, status: 'available' }),
            Object.keys(filterHostel).length === 0 ? BedSpace.countDocuments({ status: 'occupied' }) : BedSpace.countDocuments({ ...bedFilter, status: 'occupied' }),
            Application.countDocuments({ ...appFilter, application_status: 'pending' }),
            Application.countDocuments({ ...appFilter, application_status: 'approved' }),
            Application.countDocuments({ ...appFilter, application_status: 'allocated' })
        ]);

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
 */
router.get('/hostels', async (req, res) => {
    try {
        const filter = req.user.role === 'admin' && req.user.assigned_gender !== 'all' 
            ? { gender: req.user.assigned_gender } : {};
        const hostels = await Hostel.find(filter).lean();

        // Enrich with counts via aggregation
        const enriched = await Promise.all(hostels.map(async (hostel) => {
            const blocks = await Block.find({ hostel: hostel._id }).lean();
            const blockIds = blocks.map(b => b._id);
            const rooms = await Room.find({ block: { $in: blockIds } }).lean();
            const roomIds = rooms.map(r => r._id);
            const totalBeds = await BedSpace.countDocuments({ room: { $in: roomIds } });
            const availableBeds = await BedSpace.countDocuments({ room: { $in: roomIds }, status: 'available' });

            return {
                ...hostel,
                total_blocks: blocks.length,
                total_rooms: rooms.length,
                total_beds: totalBeds,
                available_beds: availableBeds
            };
        }));

        res.json({ hostels: enriched });
    } catch (err) {
        console.error('Hostels list error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * POST /api/admin/hostels
 */
router.post('/hostels', async (req, res) => {
    try {
        const { name, gender, description } = req.body;
        if (!name || !gender) {
            return res.status(400).json({ error: 'Hostel name and gender are required.' });
        }

        const hostel = await Hostel.create({ name, gender, description: description || null });
        res.status(201).json({ message: 'Hostel created successfully.', hostel });
    } catch (err) {
        console.error('Hostel creation error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * POST /api/admin/blocks
 */
router.post('/blocks', async (req, res) => {
    try {
        const { hostel_id, block_name, floor_count } = req.body;
        if (!hostel_id || !block_name) {
            return res.status(400).json({ error: 'Hostel ID and block name are required.' });
        }

        const block = await Block.create({
            hostel: hostel_id,
            block_name,
            floor_count: floor_count || 1
        });
        res.status(201).json({ message: 'Block created successfully.', block });
    } catch (err) {
        console.error('Block creation error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * POST /api/admin/rooms
 * Create a room with auto-generated bed spaces
 */
router.post('/rooms', async (req, res) => {
    try {
        const { block_id, room_number, floor, capacity, room_type } = req.body;
        if (!block_id || !room_number) {
            return res.status(400).json({ error: 'Block ID and room number are required.' });
        }

        const roomCapacity = capacity || 4;
        const room = await Room.create({
            block: block_id,
            room_number,
            floor: floor || 1,
            capacity: roomCapacity,
            room_type: room_type || 'regular'
        });

        // Auto-create bed spaces
        const bedDocs = [];
        for (let i = 1; i <= roomCapacity; i++) {
            bedDocs.push({ room: room._id, bed_number: `Bed ${i}`, status: 'available' });
        }
        await BedSpace.insertMany(bedDocs);

        res.status(201).json({
            message: `Room created with ${roomCapacity} bed spaces.`,
            room: { id: room._id, block_id, room_number, capacity: roomCapacity }
        });
    } catch (err) {
        console.error('Room creation error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * GET /api/admin/applications
 */
router.get('/applications', async (req, res) => {
    try {
        const { session, status } = req.query;
        const filter = {};
        if (session) filter.session = session;
        if (status) filter.application_status = status;

        if (req.user.role === 'admin' && req.user.assigned_gender !== 'all') {
            const allowedStudents = await Student.find({ gender: req.user.assigned_gender }).select('_id').lean();
            filter.student = { $in: allowedStudents.map(s => s._id) };
        }

        const applications = await Application.find(filter)
            .populate('student', 'matric_no first_name last_name gender level department')
            .populate('hostel_preference', 'name')
            .sort({ createdAt: -1 })
            .lean();

        const formatted = applications.map(a => ({
            id: a._id,
            session: a.session,
            payment_status: a.payment_status,
            application_status: a.application_status,
            priority_score: a.priority_score,
            applied_at: a.createdAt,
            matric_no: a.student?.matric_no,
            first_name: a.student?.first_name,
            last_name: a.student?.last_name,
            gender: a.student?.gender,
            level: a.student?.level,
            department: a.student?.department,
            hostel_preference: a.hostel_preference?.name || null
        }));

        res.json({ applications: formatted });
    } catch (err) {
        console.error('Applications list error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * POST /api/admin/allocate
 */
router.post('/allocate', async (req, res) => {
    try {
        const { session } = req.body;
        if (!session) {
            return res.status(400).json({ error: 'Academic session is required.' });
        }

        const result = await runAllocation(session);
        res.json(result);
    } catch (err) {
        console.error('Allocation error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * GET /api/admin/allocations
 */
router.get('/allocations', async (req, res) => {
    try {
        const { session } = req.query;
        const filter = {};
        if (session) filter.session = session;

        if (req.user.role === 'admin' && req.user.assigned_gender !== 'all') {
            const allowedStudents = await Student.find({ gender: req.user.assigned_gender }).select('_id').lean();
            filter.student = { $in: allowedStudents.map(s => s._id) };
        }

        const allocations = await Allocation.find(filter)
            .populate('student', 'matric_no first_name last_name gender level')
            .populate({
                path: 'bed_space',
                select: 'bed_number room',
                populate: {
                    path: 'room',
                    select: 'room_number floor block',
                    populate: {
                        path: 'block',
                        select: 'block_name hostel',
                        populate: { path: 'hostel', select: 'name' }
                    }
                }
            })
            .sort({ createdAt: -1 })
            .lean();

        const formatted = allocations.map(al => ({
            id: al._id,
            session: al.session,
            allocated_at: al.createdAt,
            status: al.status,
            matric_no: al.student?.matric_no,
            first_name: al.student?.first_name,
            last_name: al.student?.last_name,
            gender: al.student?.gender,
            level: al.student?.level,
            bed_number: al.bed_space?.bed_number,
            room_number: al.bed_space?.room?.room_number,
            floor: al.bed_space?.room?.floor,
            block_name: al.bed_space?.room?.block?.block_name,
            hostel_name: al.bed_space?.room?.block?.hostel?.name
        }));

        res.json({ allocations: formatted });
    } catch (err) {
        console.error('Allocations list error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * GET /api/admin/users
 */
router.get('/users', authorize('super_admin'), async (req, res) => {
    try {
        const users = await Admin.find({}, '-password').lean();
        res.json({ users });
    } catch (err) {
        console.error('Fetch users error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * POST /api/admin/users
 */
router.post('/users', authorize('super_admin'), async (req, res) => {
    try {
        const { username, email, full_name, password, assigned_gender } = req.body;
        if (!username || !email || !full_name || !password || !assigned_gender) {
            return res.status(400).json({ error: 'All fields are required.' });
        }
        
        const existing = await Admin.findOne({ $or: [{ username }, { email }] });
        if (existing) {
            return res.status(409).json({ error: 'Username or email already exists.' });
        }

        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = await Admin.create({
            username, email, full_name, password: hashedPassword, role: 'admin', assigned_gender
        });
        
        const userObj = newUser.toObject();
        delete userObj.password;
        
        res.status(201).json({ message: 'Admin user created successfully.', user: userObj });
    } catch (err) {
        console.error('Create user error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

module.exports = router;
