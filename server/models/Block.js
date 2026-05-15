const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema({
    hostel:     { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
    block_name: { type: String, required: true },
    floor_count:{ type: Number, default: 1 }
}, { timestamps: true });

module.exports = mongoose.model('Block', blockSchema);
