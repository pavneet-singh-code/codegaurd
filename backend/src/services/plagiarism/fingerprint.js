const crypto = require('crypto');

/**
 * Fingerprinting = k-grams + hashing + winnowing.
 *
 *  1. Every run of k consecutive token values is a k-gram.
 *  2. Each k-gram is hashed with SHA-1 (Node's built-in crypto); the first 32 bits are kept.
 *  3. Winnowing (Schleimer, Wilkerson, Aiken 2003): slide a window of w hashes over the list and
 *     keep the minimum of each window (rightmost one on ties). This keeps roughly 2/(w+1) of the
 *     hashes but guarantees that any exact match of at least w + k - 1 tokens shares a fingerprint.
 */
function hashKgram(values) {
  return crypto.createHash('sha1').update(values.join(' ')).digest().readUInt32BE(0);
}

function kgramHashes(tokens, k) {
  const out = [];
  for (let i = 0; i + k <= tokens.length; i++) {
    out.push({ hash: hashKgram(tokens.slice(i, i + k).map((t) => t.value)), pos: i });
  }
  return out;
}

function winnow(hashes, w) {
  if (hashes.length === 0) return [];
  const win = Math.min(w, hashes.length);
  const selected = [];
  let lastIdx = -1;
  for (let s = 0; s + win <= hashes.length; s++) {
    let min = s;
    for (let j = s + 1; j < s + win; j++) if (hashes[j].hash <= hashes[min].hash) min = j;
    if (min !== lastIdx) { selected.push(hashes[min]); lastIdx = min; }
  }
  return selected;
}

function fingerprint(tokens, { kgramSize, windowSize }) {
  if (!Number.isInteger(kgramSize) || kgramSize < 1) throw new Error('kgramSize must be a positive integer');
  if (!Number.isInteger(windowSize) || windowSize < 1) throw new Error('windowSize must be a positive integer');
  return winnow(kgramHashes(tokens, kgramSize), windowSize); // [{ hash, pos }]
}

module.exports = { fingerprint, kgramHashes, winnow, hashKgram };
