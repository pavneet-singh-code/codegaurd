const env = require('../../config/env');

// Detector parameters. Every value can be overridden per call (and per analysis request).
const defaults = () => ({
  kgramSize: env.kgramSize,         // k: tokens per k-gram
  windowSize: env.windowSize,       // w: winnowing window (in k-gram hashes)
  minFingerprints: env.minFingerprints, // below this, a file is too short to compare reliably
});
module.exports = { defaults };
