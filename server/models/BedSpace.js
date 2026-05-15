const mongoose = require('mongoose');

const bedSpaceSchema = new mongoose.Schema({
    room:       { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    bed_number: { type: String, required: true },
    status:     { type: String, enum: ['available', 'occupied', 'reserved', 'maintenance'], default: 'available' }
}, { timestamps: true });

module.exports = mongoose.model('BedSpace', bedSpaceSchema);
