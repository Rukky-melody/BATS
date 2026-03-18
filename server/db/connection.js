const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DB_PATH = process.env.DB_PATH || './db/bats.db';
const dbPath = path.resolve(__dirname, '..', DB_PATH);

let db;

function getDb() {
    if (!db) {
        db = new Database(dbPath);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
    }
    return db;
}

function closeDb() {
    if (db) {
        db.close();
        db = null;
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    closeDb();
    process.exit(0);
});

module.exports = { getDb, closeDb };
