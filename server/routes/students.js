const express = require('express');
const Student = require('../models/Student');
const Application = require('../models/Application');
const Allocation = require('../models/Allocation');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require student authentication
router.use(authenticate, authorize('student'));

/**
 * GET /api/students/profile
 */
router.get('/profile', async (req, res) => {
    try {
        const student = await Student.findById(req.user.id)
            .select('-password');

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
 */
router.put('/profile', async (req, res) => {
    try {
        const { phone, state_of_origin, disability_status } = req.body;
        const updates = {};
        if (phone !== undefined) updates.phone = phone;
        if (state_of_origin !== undefined) updates.state_of_origin = state_of_origin;
        if (disability_status !== undefined) updates.disability_status = disability_status;

        const updated = await Student.findByIdAndUpdate(
            req.user.id,
            { $set: updates },
            { new: true }
        ).select('-password');

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
router.post('/apply', async (req, res) => {
    try {
        const { session, hostel_preference_id } = req.body;

        if (!session) {
            return res.status(400).json({ error: 'Academic session is required.' });
        }

        // Check for existing active application in same session
        const existing = await Application.findOne({
            student: req.user.id,
            session,
            application_status: { $nin: ['rejected', 'cancelled'] }
        });

        if (existing) {
            return res.status(409).json({ error: 'You already have an active application for this session.' });
        }

        // Calculate priority score
        const student = await Student.findById(req.user.id).select('level disability_status');
        let priorityScore = 0;
        if (student.level === 500) priorityScore += 30;
        else if (student.level === 400) priorityScore += 20;
        else if (student.level === 300) priorityScore += 10;
        if (student.disability_status) priorityScore += 50;

        const application = await Application.create({
            student: req.user.id,
            session,
            hostel_preference: hostel_preference_id || null,
            priority_score: priorityScore
        });

        res.status(201).json({
            message: 'Application submitted successfully.',
            application: {
                id: application._id,
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
 */
router.get('/application-status', async (req, res) => {
    try {
        const applications = await Application.find({ student: req.user.id })
            .populate('hostel_preference', 'name')
            .sort({ createdAt: -1 })
            .lean();

        // Rename populated field for consistency
        const formattedApplications = applications.map(a => ({
            ...a,
            hostel_preference: a.hostel_preference ? a.hostel_preference.name : null
        }));

        const allocations = await Allocation.find({ student: req.user.id })
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

        // Flatten allocation info
        const formattedAllocations = allocations.map(al => ({
            id: al._id,
            session: al.session,
            allocated_at: al.createdAt,
            status: al.status,
            bed_number: al.bed_space?.bed_number,
            room_number: al.bed_space?.room?.room_number,
            floor: al.bed_space?.room?.floor,
            block_name: al.bed_space?.room?.block?.block_name,
            hostel_name: al.bed_space?.room?.block?.hostel?.name
        }));

        res.json({ applications: formattedApplications, allocations: formattedAllocations });
    } catch (err) {
        console.error('Status check error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * POST /api/students/simulate-payment
 */
router.post('/simulate-payment', async (req, res) => {
    try {
        const { application_id } = req.body;

        const application = await Application.findOne({
            _id: application_id,
            student: req.user.id
        });

        if (!application) {
            return res.status(404).json({ error: 'Application not found.' });
        }

        if (application.payment_status === 'paid' || application.payment_status === 'verified') {
            return res.status(400).json({ error: 'Payment already processed.' });
        }

        const paymentRef = `SIM-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        await Application.findByIdAndUpdate(application_id, {
            $set: {
                payment_status: 'paid',
                payment_reference: paymentRef,
                application_status: 'approved'
            }
        });

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
