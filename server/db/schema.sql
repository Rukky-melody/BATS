-- ============================================
-- BATS Database Schema
-- Automated Student Hostel Accommodation
-- & Bed Space Allocation System
-- ============================================

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matric_no TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    level INTEGER NOT NULL CHECK (level IN (100, 200, 300, 400, 500)),
    department TEXT NOT NULL,
    faculty TEXT,
    phone TEXT,
    state_of_origin TEXT,
    disability_status INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Hostels table
CREATE TABLE IF NOT EXISTS hostels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    description TEXT,
    total_blocks INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Blocks table
CREATE TABLE IF NOT EXISTS blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hostel_id INTEGER NOT NULL,
    block_name TEXT NOT NULL,
    floor_count INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE CASCADE
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    block_id INTEGER NOT NULL,
    room_number TEXT NOT NULL,
    floor INTEGER DEFAULT 1,
    capacity INTEGER NOT NULL DEFAULT 4,
    room_type TEXT DEFAULT 'regular' CHECK (room_type IN ('regular', 'special_needs')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE
);

-- Bed spaces table
CREATE TABLE IF NOT EXISTS bed_spaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    bed_number TEXT NOT NULL,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'maintenance')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- Applications table
CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    session TEXT NOT NULL,
    hostel_preference_id INTEGER,
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'verified')),
    payment_reference TEXT,
    application_status TEXT DEFAULT 'pending' CHECK (application_status IN ('pending', 'approved', 'allocated', 'rejected', 'cancelled')),
    priority_score REAL DEFAULT 0,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (hostel_preference_id) REFERENCES hostels(id)
);

-- Allocations table
CREATE TABLE IF NOT EXISTS allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL UNIQUE,
    student_id INTEGER NOT NULL,
    bed_space_id INTEGER NOT NULL,
    session TEXT NOT NULL,
    allocated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'vacated', 'transferred')),
    vacated_at DATETIME,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (bed_space_id) REFERENCES bed_spaces(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_students_matric ON students(matric_no);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_applications_student ON applications(student_id);
CREATE INDEX IF NOT EXISTS idx_applications_session ON applications(session);
CREATE INDEX IF NOT EXISTS idx_allocations_student ON allocations(student_id);
CREATE INDEX IF NOT EXISTS idx_allocations_session ON allocations(session);
CREATE INDEX IF NOT EXISTS idx_bed_spaces_status ON bed_spaces(status);
CREATE INDEX IF NOT EXISTS idx_rooms_block ON rooms(block_id);
CREATE INDEX IF NOT EXISTS idx_blocks_hostel ON blocks(hostel_id);
