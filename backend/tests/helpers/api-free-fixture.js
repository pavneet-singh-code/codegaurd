// Fixture loader that does not load Express or MongoDB (used by pure unit tests).
const fs = require('fs');
const path = require('path');
exports.fixture = (lang, name) => fs.readFileSync(path.join(__dirname, '../fixtures', lang, name), 'utf8');
