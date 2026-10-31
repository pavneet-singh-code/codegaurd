const { fingerprint } = require('./fingerprint');

/**
 * Finds matching regions between two token streams.
 *
 *  - Every fingerprint hash found in both files is a "seed" (position i in A, position j in B).
 *  - A seed is accepted only after comparing the real token values (guards against hash collisions).
 *  - Each accepted seed is extended left and right while tokens remain exactly equal, giving the
 *    maximal exact run on that diagonal (j - i). Seeds already inside a run are skipped.
 *  - Token indexes are converted to source line numbers using the line stored on each token.
 *
 * Only exact token matches are reported, so no region is invented. Renamed identifiers still
 * match because identifiers are normalised to ID before this step.
 */
const MAX_OCCURRENCES = 10;

function findMatchingRegions(tokensA, tokensB, { kgramSize, windowSize }, maxRegions = 20) {
  const fpA = fingerprint(tokensA, { kgramSize, windowSize });
  const fpB = fingerprint(tokensB, { kgramSize, windowSize });
  const byHashB = new Map();
  for (const f of fpB) {
    if (!byHashB.has(f.hash)) byHashB.set(f.hash, []);
    byHashB.get(f.hash).push(f.pos);
  }
  const same = (i, j) => tokensA[i].value === tokensB[j].value;

  const seeds = [];
  for (const f of fpA) {
    const positions = (byHashB.get(f.hash) || []).slice(0, MAX_OCCURRENCES);
    for (const j of positions) {
      let ok = true;
      for (let o = 0; o < kgramSize; o++) if (!same(f.pos + o, j + o)) { ok = false; break; }
      if (ok) seeds.push({ i: f.pos, j });
    }
  }
  seeds.sort((x, y) => (x.j - x.i) - (y.j - y.i) || x.i - y.i);

  const regions = [];
  const lastEnd = new Map(); // diagonal -> last covered index in A
  for (const { i, j } of seeds) {
    const diag = j - i;
    if ((lastEnd.get(diag) ?? -1) >= i) continue;
    let a = i; let b = j;
    while (a > 0 && b > 0 && same(a - 1, b - 1)) { a--; b--; }
    let len = 0;
    while (a + len < tokensA.length && b + len < tokensB.length && same(a + len, b + len)) len++;
    lastEnd.set(diag, a + len - 1);
    regions.push({
      tokenCount: len,
      aStartLine: tokensA[a].line, aEndLine: tokensA[a + len - 1].line,
      bStartLine: tokensB[b].line, bEndLine: tokensB[b + len - 1].line,
      aTokenStart: a, bTokenStart: b,
    });
  }
  regions.sort((x, y) => y.tokenCount - x.tokenCount);

  const coveredA = new Set(); const coveredB = new Set();
  for (const r of regions) for (let o = 0; o < r.tokenCount; o++) { coveredA.add(r.aTokenStart + o); coveredB.add(r.bTokenStart + o); }
  return {
    regions: regions.slice(0, maxRegions),
    totalRegions: regions.length,
    matchedTokensA: coveredA.size,
    matchedTokensB: coveredB.size,
    tokenCountA: tokensA.length,
    tokenCountB: tokensB.length,
  };
}

module.exports = { findMatchingRegions };
