const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    username:  { type: String, required: true, unique: true, trim: true },
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:  { type: String, required: true },
    full_name: { type: String, required: true },
    role:      { type: String, required: true, enum: ['admin', 'super_admin'], default: 'admin' }
}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema);
