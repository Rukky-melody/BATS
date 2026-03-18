const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DB_PATH = process.env.DB_PATH || './db/bats.db';
const dbPath = path.resolve(__dirname, '..', DB_PATH);

// Ensure directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode and foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Read and execute schema
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);

console.log('✅ Database tables created successfully.');

// Seed default admin account
const adminExists = db.prepare('SELECT id FROM admins WHERE username = ?').get('admin');
if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare(`
        INSERT INTO admins (username, email, password, full_name, role)
        VALUES (?, ?, ?, ?, ?)
    `).run('admin', 'admin@fupre.edu.ng', hashedPassword, 'System Administrator', 'super_admin');
    console.log('✅ Default admin account created (username: admin, password: admin123)');
} else {
    console.log('ℹ️  Admin account already exists, skipping seed.');
}

// Seed sample hostels for demonstration
const hostelExists = db.prepare('SELECT id FROM hostels LIMIT 1').get();
if (!hostelExists) {
    const insertHostel = db.prepare('INSERT INTO hostels (name, gender, description) VALUES (?, ?, ?)');
    const insertBlock = db.prepare('INSERT INTO blocks (hostel_id, block_name, floor_count) VALUES (?, ?, ?)');
    const insertRoom = db.prepare('INSERT INTO rooms (block_id, room_number, floor, capacity) VALUES (?, ?, ?, ?)');
    const insertBed = db.prepare('INSERT INTO bed_spaces (room_id, bed_number, status) VALUES (?, ?, ?)');

    const seedTransaction = db.transaction(() => {
        // Male hostel
        const maleHostel = insertHostel.run('Hall A - Male Hostel', 'male', 'Main male hostel facility');
        const maleBlock = insertBlock.run(maleHostel.lastInsertRowid, 'Block 1', 3);
        for (let floor = 1; floor <= 3; floor++) {
            for (let room = 1; room <= 5; room++) {
                const roomNum = `${floor}0${room}`;
                const roomResult = insertRoom.run(maleBlock.lastInsertRowid, roomNum, floor, 4);
                for (let bed = 1; bed <= 4; bed++) {
                    insertBed.run(roomResult.lastInsertRowid, `Bed ${bed}`, 'available');
                }
            }
        }

        // Female hostel
        const femaleHostel = insertHostel.run('Hall B - Female Hostel', 'female', 'Main female hostel facility');
        const femaleBlock = insertBlock.run(femaleHostel.lastInsertRowid, 'Block 1', 3);
        for (let floor = 1; floor <= 3; floor++) {
            for (let room = 1; room <= 5; room++) {
                const roomNum = `${floor}0${room}`;
                const roomResult = insertRoom.run(femaleBlock.lastInsertRowid, roomNum, floor, 4);
                for (let bed = 1; bed <= 4; bed++) {
                    insertBed.run(roomResult.lastInsertRowid, `Bed ${bed}`, 'available');
                }
            }
        }
    });

    seedTransaction();
    console.log('✅ Sample hostels seeded (2 hostels, 30 rooms, 120 bed spaces)');
} else {
    console.log('ℹ️  Hostels already exist, skipping seed.');
}

db.close();
console.log('\n🎉 Database initialization complete!');
