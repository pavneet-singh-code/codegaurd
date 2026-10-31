const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  submissionA: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true },
  submissionB: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true },
  studentA: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentB: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  similarityScore: { type: Number, required: true }, // max(coverageA, coverageB), 0..1
  jaccard: { type: Number, required: true },
  coverageA: { type: Number, required: true },
  coverageB: { type: Number, required: true },
  sharedFingerprintCount: { type: Number, required: true },
  fingerprintCountA: { type: Number, required: true },
  fingerprintCountB: { type: Number, required: true },
  status: { type: String, enum: ['REVIEW_REQUIRED', 'NOT_FLAGGED'], required: true },
});

const analysisSchema = new mongoose.Schema(
  {
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true, index: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    threshold: { type: Number, required: true, min: 0, max: 1 },
    parameters: {
      kgramSize: { type: Number, required: true },
      windowSize: { type: Number, required: true },
      minFingerprints: { type: Number, required: true },
    },
    status: { type: String, enum: ['RUNNING', 'COMPLETED', 'FAILED'], default: 'RUNNING' },
    errorMessage: { type: String },
    totalSubmissions: { type: Number, default: 0 },
    totalPairsCompared: { type: Number, default: 0 },
    flaggedPairs: { type: Number, default: 0 },
    results: [resultSchema],
    completedAt: { type: Date },
  },
  { timestamps: true }
);
analysisSchema.index({ requestedBy: 1, createdAt: -1 });

analysisSchema.set('toJSON', { transform: (_d, ret) => { delete ret.__v; return ret; } });

module.exports = mongoose.model('Analysis', analysisSchema);
