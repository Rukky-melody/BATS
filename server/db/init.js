const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { connectDB } = require('./connection');
const Admin = require('../models/Admin');
const Hostel = require('../models/Hostel');
const Block = require('../models/Block');
const Room = require('../models/Room');
const BedSpace = require('../models/BedSpace');

async function seedDatabase() {
    await connectDB();

    // ── Seed default admin ──────────────────────────────
    const adminExists = await Admin.findOne({ username: 'admin' });
    if (!adminExists) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await Admin.create({
            username: 'admin',
            email: 'admin@fupre.edu.ng',
            password: hashedPassword,
            full_name: 'System Administrator',
            role: 'super_admin'
        });
        console.log('✅ Default admin account created (username: admin, password: admin123)');
    } else {
        console.log('ℹ️  Admin account already exists, skipping seed.');
    }

    // ── Seed sample hostels ─────────────────────────────
    const hostelExists = await Hostel.findOne();
    if (!hostelExists) {
        // Helper: create hostel → block → rooms → beds
        async function createHostel(name, gender, description, floors, roomsPerFloor, bedsPerRoom) {
            const hostel = await Hostel.create({ name, gender, description });
            const block = await Block.create({ hostel: hostel._id, block_name: 'Block 1', floor_count: floors });

            for (let floor = 1; floor <= floors; floor++) {
                for (let room = 1; room <= roomsPerFloor; room++) {
                    const roomNum = `${floor}0${room}`;
                    const createdRoom = await Room.create({
                        block: block._id,
                        room_number: roomNum,
                        floor,
                        capacity: bedsPerRoom
                    });
                    const beds = [];
                    for (let bed = 1; bed <= bedsPerRoom; bed++) {
                        beds.push({ room: createdRoom._id, bed_number: `Bed ${bed}`, status: 'available' });
                    }
                    await BedSpace.insertMany(beds);
                }
            }
        }

        await createHostel('Hall A - Male Hostel',   'male',   'Main male hostel facility',   3, 5, 4);
        await createHostel('Hall B - Female Hostel', 'female', 'Main female hostel facility', 3, 5, 4);
        console.log('✅ Sample hostels seeded (2 hostels, 30 rooms, 120 bed spaces)');
    } else {
        console.log('ℹ️  Hostels already exist, skipping seed.');
    }

    await mongoose.disconnect();
    console.log('\n🎉 Database initialization complete!');
}

seedDatabase().catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
});
