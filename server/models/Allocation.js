const mongoose = require('mongoose');

const allocationSchema = new mongoose.Schema({
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true, unique: true },
    student:     { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    bed_space:   { type: mongoose.Schema.Types.ObjectId, ref: 'BedSpace', required: true },
    session:     { type: String, required: true },
    status:      { type: String, enum: ['active', 'vacated', 'transferred'], default: 'active' },
    vacated_at:  { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Allocation', allocationSchema);
