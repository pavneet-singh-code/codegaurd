/**
 * Similarity metrics over two fingerprint lists. Each list is turned into a SET of hashes:
 *
 *   A, B          = sets of winnowed fingerprint hashes
 *   shared        = |A ∩ B|
 *   jaccard       = |A ∩ B| / |A ∪ B|     (symmetric; punishes size differences)
 *   coverageA     = |A ∩ B| / |A|          (how much of A also appears in B)
 *   coverageB     = |A ∩ B| / |B|
 *   similarityScore = max(coverageA, coverageB)
 *
 * Why max(coverage)? If a student copies a whole solution and adds extra code, Jaccard drops
 * because the union grows, but the copied program is still ~100% contained in the new one.
 * Directional coverage catches that case. Jaccard is reported as well so both views are visible.
 *
 * Files with fewer than `minFingerprints` fingerprints are too short to compare reliably:
 * their score is 0 and `tooShort` is true. A high score is a reason to LOOK at two files, never proof.
 */
const round = (x) => Math.round(x * 10000) / 10000;

function compareFingerprints(fpA, fpB, { minFingerprints = 5 } = {}) {
  const A = new Set(fpA.map((f) => f.hash));
  const B = new Set(fpB.map((f) => f.hash));
  let shared = 0;
  for (const h of A) if (B.has(h)) shared++;
  const union = A.size + B.size - shared;
  const jaccard = union ? shared / union : 0;
  const coverageA = A.size ? shared / A.size : 0;
  const coverageB = B.size ? shared / B.size : 0;
  const tooShort = A.size < minFingerprints || B.size < minFingerprints;
  return {
    sharedFingerprintCount: shared,
    fingerprintCountA: A.size,
    fingerprintCountB: B.size,
    jaccard: round(jaccard),
    coverageA: round(coverageA),
    coverageB: round(coverageB),
    similarityScore: tooShort ? 0 : round(Math.max(coverageA, coverageB)),
    tooShort,
  };
}

module.exports = { compareFingerprints };
