const { getDb } = require('../db/connection');

/**
 * Allocation Algorithm — Random Balloting with Priority Weighting
 * 
 * Allocates bed spaces to approved applications using a fair system:
 * 1. Gathers all approved (paid) applications for the given session
 * 2. Sorts by priority score (disability, final-year students ranked higher)
 * 3. Randomizes within same priority tier for fairness
 * 4. Assigns available bed spaces matching student gender
 * 
 * @param {string} session - Academic session (e.g., '2025/2026')
 * @returns {object} - Allocation results summary
 */
function runAllocation(session) {
    const db = getDb();

    // Get approved applications with student info
    const applications = db.prepare(`
        SELECT 
            a.id as application_id,
            a.student_id,
            a.priority_score,
            a.hostel_preference_id,
            s.gender
        FROM applications a
        JOIN students s ON a.student_id = s.id
        WHERE a.session = ? 
            AND a.application_status = 'approved'
            AND a.payment_status IN ('paid', 'verified')
        ORDER BY a.priority_score DESC
    `).all(session);

    if (applications.length === 0) {
        return { success: false, message: 'No approved applications found for this session.', allocated: 0 };
    }

    // Shuffle applications within the same priority tier for fairness
    const shuffled = shuffleWithinTiers(applications);

    let allocated = 0;
    let failed = 0;

    const allocateStmt = db.prepare(`
        INSERT INTO allocations (application_id, student_id, bed_space_id, session)
        VALUES (?, ?, ?, ?)
    `);
    const updateAppStmt = db.prepare(`
        UPDATE applications SET application_status = 'allocated', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
    const updateBedStmt = db.prepare(`
        UPDATE bed_spaces SET status = 'occupied' WHERE id = ?
    `);

    const allocationTransaction = db.transaction(() => {
        for (const app of shuffled) {
            // Check if already allocated
            const existing = db.prepare(
                'SELECT id FROM allocations WHERE application_id = ?'
            ).get(app.application_id);
            if (existing) continue;

            // Find available bed space matching gender
            let bedQuery = `
                SELECT bs.id as bed_space_id
                FROM bed_spaces bs
                JOIN rooms r ON bs.room_id = r.id
                JOIN blocks b ON r.block_id = b.id
                JOIN hostels h ON b.hostel_id = h.id
                WHERE bs.status = 'available'
                    AND h.gender = ?
            `;
            const params = [app.gender];

            // Prefer hostel preference if specified
            if (app.hostel_preference_id) {
                bedQuery += ' ORDER BY CASE WHEN h.id = ? THEN 0 ELSE 1 END, RANDOM() LIMIT 1';
                params.push(app.hostel_preference_id);
            } else {
                bedQuery += ' ORDER BY RANDOM() LIMIT 1';
            }

            const bed = db.prepare(bedQuery).get(...params);

            if (bed) {
                allocateStmt.run(app.application_id, app.student_id, bed.bed_space_id, session);
                updateAppStmt.run(app.application_id);
                updateBedStmt.run(bed.bed_space_id);
                allocated++;
            } else {
                failed++;
            }
        }
    });

    allocationTransaction();

    return {
        success: true,
        message: `Allocation complete for session ${session}.`,
        total_applications: applications.length,
        allocated,
        failed_no_space: failed
    };
}

/**
 * Shuffle applications within the same priority tier
 * Keeps higher priority scores first, but randomizes order within same score
 */
function shuffleWithinTiers(applications) {
    // Group by priority score
    const tiers = {};
    for (const app of applications) {
        const score = app.priority_score;
        if (!tiers[score]) tiers[score] = [];
        tiers[score].push(app);
    }

    // Fisher-Yates shuffle within each tier, then concatenate in descending priority
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
