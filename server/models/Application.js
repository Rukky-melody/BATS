const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
    student:             { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    session:             { type: String, required: true },
    hostel_preference:   { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', default: null },
    payment_status:      { type: String, enum: ['unpaid', 'paid', 'verified'], default: 'unpaid' },
    payment_reference:   { type: String, default: null },
    application_status:  { type: String, enum: ['pending', 'approved', 'allocated', 'rejected', 'cancelled'], default: 'pending' },
    priority_score:      { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Application', applicationSchema);
