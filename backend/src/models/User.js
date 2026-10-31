const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['PROFESSOR', 'STUDENT'], required: true },
  },
  { timestamps: true }
);

// Never leak the hash, even if a controller forgets to strip it.
userSchema.set('toJSON', {
  transform: (_doc, ret) => { delete ret.password; delete ret.__v; return ret; },
});

module.exports = mongoose.model('User', userSchema);
