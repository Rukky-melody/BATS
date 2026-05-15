const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    block:       { type: mongoose.Schema.Types.ObjectId, ref: 'Block', required: true },
    room_number: { type: String, required: true },
    floor:       { type: Number, default: 1 },
    capacity:    { type: Number, required: true, default: 4 },
    room_type:   { type: String, enum: ['regular', 'special_needs'], default: 'regular' }
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
