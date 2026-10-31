const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret-0123456789';
process.env.BCRYPT_ROUNDS = '4';
process.env.MAX_FILE_SIZE_BYTES = '20000';
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'codeguard-uploads-'));
