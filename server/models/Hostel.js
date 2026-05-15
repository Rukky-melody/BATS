const mongoose = require('mongoose');

const hostelSchema = new mongoose.Schema({
    name:        { type: String, required: true },
    gender:      { type: String, required: true, enum: ['male', 'female'] },
    description: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Hostel', hostelSchema);
