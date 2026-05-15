const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    matric_no: { type: String, required: true, unique: true, trim: true },
    first_name: { type: String, required: true, trim: true },
    last_name:  { type: String, required: true, trim: true },
    email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:   { type: String, required: true },
    gender:     { type: String, required: true, enum: ['male', 'female'] },
    level:      { type: Number, required: true, enum: [100, 200, 300, 400, 500] },
    department: { type: String, required: true },
    faculty:    { type: String, default: null },
    phone:      { type: String, default: null },
    state_of_origin:   { type: String, default: null },
    disability_status: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
