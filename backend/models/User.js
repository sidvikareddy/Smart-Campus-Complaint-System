const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ['student', 'staff', 'admin'], default: 'student' },
    studentId: { type: String, trim: true },
    staffId: { type: String, trim: true },
    department: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
