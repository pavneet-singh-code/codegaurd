const path = require('path');
require('dotenv').config();

const int = (v, d) => (Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : d);
const num = (v, d) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : d);

// Read lazily so tests can change process.env before the app is used.
module.exports = {
  get nodeEnv() { return process.env.NODE_ENV || 'development'; },
  get port() { return int(process.env.PORT, 5000); },
  get mongoUri() { return process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/codeguard'; },
  get jwtSecret() { return process.env.JWT_SECRET; },
  get jwtExpiresIn() { return process.env.JWT_EXPIRES_IN || '1d'; },
  get uploadDir() { return path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads')); },
  get maxFileSizeBytes() { return int(process.env.MAX_FILE_SIZE_BYTES, 256 * 1024); },
  get corsOrigins() { return (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()); },
  get professorInviteCode() { return process.env.PROFESSOR_INVITE_CODE || ''; },
  get defaultThreshold() { return num(process.env.DEFAULT_THRESHOLD, 0.6); },
  get kgramSize() { return int(process.env.KGRAM_SIZE, 5); },
  get windowSize() { return int(process.env.WINNOW_WINDOW, 4); },
  get minFingerprints() { return int(process.env.MIN_FINGERPRINTS, 5); },
};
