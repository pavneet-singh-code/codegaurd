const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, default: '', trim: true, maxlength: 5000 },
    programmingLanguage: { type: String, enum: ['java', 'python'], required: true },
    professor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    deadline: { type: Date, required: true },
    allowLateSubmissions: { type: Boolean, default: true },
    status: { type: String, enum: ['OPEN', 'CLOSED'], default: 'OPEN' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Assignment', assignmentSchema);
