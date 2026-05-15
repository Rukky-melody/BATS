const Application = require('../models/Application');
const Allocation = require('../models/Allocation');
const BedSpace = require('../models/BedSpace');
const Block = require('../models/Block');
const Student = require('../models/Student');

/**
 * Allocation Algorithm — Random Balloting with Priority Weighting
 *
 * 1. Gathers all approved (paid) applications for the given session
 * 2. Sorts by priority score (disability, final-year students ranked higher)
 * 3. Randomizes within same priority tier for fairness
 * 4. Assigns available bed spaces matching student gender
 *
 * @param {string} session - Academic session (e.g., '2025/2026')
 * @returns {object} - Allocation results summary
 */
async function runAllocation(session) {
    // Get approved applications with student gender info
    const applications = await Application.find({
        session,
        application_status: 'approved',
        payment_status: { $in: ['paid', 'verified'] }
    })
    .populate('student', 'gender')
    .populate('hostel_preference')
    .sort({ priority_score: -1 })
    .lean();

    if (applications.length === 0) {
        return { success: false, message: 'No approved applications found for this session.', allocated: 0 };
    }

    // Shuffle within same priority tier for fairness
    const shuffled = shuffleWithinTiers(applications);

    let allocated = 0;
    let failed = 0;

    for (const app of shuffled) {
        // Skip if already allocated
        const existing = await Allocation.findOne({ application: app._id });
        if (existing) continue;

        const gender = app.student?.gender;
        if (!gender) { failed++; continue; }

        // Find available bed space matching gender.
        // Prefer hostel preference if specified; otherwise random.
        const bedQuery = BedSpace.aggregate([
            { $match: { status: 'available' } },
            {
                $lookup: {
                    from: 'rooms',
                    localField: 'room',
                    foreignField: '_id',
                    as: 'roomData'
                }
            },
            { $unwind: '$roomData' },
            {
                $lookup: {
                    from: 'blocks',
                    localField: 'roomData.block',
                    foreignField: '_id',
                    as: 'blockData'
                }
            },
            { $unwind: '$blockData' },
            {
                $lookup: {
                    from: 'hostels',
                    localField: 'blockData.hostel',
                    foreignField: '_id',
                    as: 'hostelData'
                }
            },
            { $unwind: '$hostelData' },
            { $match: { 'hostelData.gender': gender } },
            { $sample: { size: 1 } }  // random pick
        ]);

        const [bed] = await bedQuery;

        if (bed) {
            // Prefer hostel preference if set — try preferred hostel's bed first
            let chosenBed = bed;

            if (app.hostel_preference) {
                const prefBedPipeline = BedSpace.aggregate([
                    { $match: { status: 'available' } },
                    {
                        $lookup: {
                            from: 'rooms',
                            localField: 'room',
                            foreignField: '_id',
                            as: 'roomData'
                        }
                    },
                    { $unwind: '$roomData' },
                    {
                        $lookup: {
                            from: 'blocks',
                            localField: 'roomData.block',
                            foreignField: '_id',
                            as: 'blockData'
                        }
                    },
                    { $unwind: '$blockData' },
                    {
                        $match: { 'blockData.hostel': app.hostel_preference._id }
                    },
                    { $sample: { size: 1 } }
                ]);
                const [prefBed] = await prefBedPipeline;
                if (prefBed) chosenBed = prefBed;
            }

            await Allocation.create({
                application: app._id,
                student: app.student._id,
                bed_space: chosenBed._id,
                session
            });

            await Application.findByIdAndUpdate(app._id, {
                $set: { application_status: 'allocated' }
            });

            await BedSpace.findByIdAndUpdate(chosenBed._id, {
                $set: { status: 'occupied' }
            });

            allocated++;
        } else {
            failed++;
        }
    }

    return {
        success: true,
        message: `Allocation complete for session ${session}.`,
        total_applications: applications.length,
        allocated,
        failed_no_space: failed
    };
}

/**
 * Shuffle applications within the same priority tier.
 * Keeps higher priority scores first, but randomises within same score.
 */
function shuffleWithinTiers(applications) {
    const tiers = {};
    for (const app of applications) {
        const score = app.priority_score;
        if (!tiers[score]) tiers[score] = [];
        tiers[score].push(app);
    }

    const result = [];
    const scores = Object.keys(tiers).map(Number).sort((a, b) => b - a);

    for (const score of scores) {
        const tier = tiers[score];
        for (let i = tier.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tier[i], tier[j]] = [tier[j], tier[i]];
        }
        result.push(...tier);
    }

    return result;
}

module.exports = { runAllocation };
