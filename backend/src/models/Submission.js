const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    version: { type: Number, required: true, min: 1 },
    originalFilename: { type: String, required: true, maxlength: 200 },
    storedFilename: { type: String, required: true },
    filePath: { type: String, required: true }, // relative to the uploads directory
    contentHash: { type: String, required: true }, // sha256, used to detect re-uploads of the same file
    programmingLanguage: { type: String, enum: ['java', 'python'], required: true },
    submittedAt: { type: Date, required: true },
    isLate: { type: Boolean, default: false },
    status: { type: String, enum: ['SUBMITTED', 'SUPERSEDED'], default: 'SUBMITTED' },
  },
  { timestamps: true }
);

// One row per (assignment, student, version): prevents duplicate version numbers.
submissionSchema.index({ assignment: 1, student: 1, version: 1 }, { unique: true });
submissionSchema.index({ student: 1, submittedAt: -1 });

// Internal storage details are never sent to clients.
submissionSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.filePath; delete ret.storedFilename; delete ret.contentHash; delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Submission', submissionSchema);
