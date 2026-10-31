const path = require('path');
const multer = require('multer');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const ALLOWED = { '.java': 'java', '.py': 'python' };

// Memory storage + size limit: the file is checked first, then written by fileStorage.save().
// Field name must be "file". Only one file per request.
const uploader = () => multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxFileSizeBytes, files: 1, fields: 5 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED[ext]) return cb(new ApiError(415, 'UNSUPPORTED_FILE_TYPE', 'Only .java and .py source files are accepted'));
    cb(null, true);
  },
}).single('file');

module.exports = { uploader, ALLOWED };
