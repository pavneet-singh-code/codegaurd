const { tokenize, supportedLanguages } = require('./tokenizer');
const { fingerprint } = require('./fingerprint');
const { compareFingerprints } = require('./similarity');
const { findMatchingRegions } = require('./regions');
const { defaults } = require('./config');

/** Compares two source strings. Pure function: no database, no filesystem. */
function compareSources(textA, textB, language, options = {}) {
  const opts = { ...defaults(), ...options };
  const tokensA = tokenize(textA, language);
  const tokensB = tokenize(textB, language);
  const fpA = fingerprint(tokensA, opts);
  const fpB = fingerprint(tokensB, opts);
  return compareFingerprints(fpA, fpB, opts);
}

/**
 * Compares every unique pair of entries [{ id, language, text }] -> n(n-1)/2 comparisons.
 * Returns [{ a: id, b: id, ...metrics }] in input order. Tokenising and fingerprinting are done
 * once per entry, not once per pair.
 */
function comparePairs(entries, options = {}) {
  const opts = { ...defaults(), ...options };
  const prepared = entries.map((e) => ({ id: e.id, fp: fingerprint(tokenize(e.text, e.language), opts) }));
  const out = [];
  for (let i = 0; i < prepared.length; i++) {
    for (let j = i + 1; j < prepared.length; j++) {
      out.push({ a: prepared[i].id, b: prepared[j].id, ...compareFingerprints(prepared[i].fp, prepared[j].fp, opts) });
    }
  }
  return out;
}

function explainPair(textA, textB, language, options = {}) {
  const opts = { ...defaults(), ...options };
  return findMatchingRegions(tokenize(textA, language), tokenize(textB, language), opts);
}

module.exports = { compareSources, comparePairs, explainPair, tokenize, fingerprint, supportedLanguages, defaults };
