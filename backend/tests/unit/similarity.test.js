const { compareFingerprints } = require('../../src/services/plagiarism/similarity');

const fps = (...hashes) => hashes.map((hash, pos) => ({ hash, pos }));

describe('similarity metrics', () => {
  test('metric definitions on a hand-computed example', () => {
    const A = fps(1, 2, 3, 4, 5, 6, 7, 8); // 8 fingerprints
    const B = fps(5, 6, 7, 8, 9, 10);       // 6 fingerprints, 4 shared
    const r = compareFingerprints(A, B, { minFingerprints: 1 });
    expect(r.sharedFingerprintCount).toBe(4);
    expect(r.jaccard).toBeCloseTo(4 / 10, 4);   // |union| = 8 + 6 - 4
    expect(r.coverageA).toBeCloseTo(4 / 8, 4);
    expect(r.coverageB).toBeCloseTo(4 / 6, 4);
    expect(r.similarityScore).toBeCloseTo(4 / 6, 4); // max(coverageA, coverageB)
  });
  test('identical sets score 1, disjoint sets score 0', () => {
    expect(compareFingerprints(fps(1, 2, 3, 4, 5, 6), fps(1, 2, 3, 4, 5, 6)).similarityScore).toBe(1);
    expect(compareFingerprints(fps(1, 2, 3, 4, 5, 6), fps(7, 8, 9, 10, 11, 12)).similarityScore).toBe(0);
  });
  test('coverage catches a copy that was padded with extra code, where Jaccard drops', () => {
    const small = fps(1, 2, 3, 4, 5, 6);
    const padded = fps(1, 2, 3, 4, 5, 6, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31);
    const r = compareFingerprints(small, padded);
    expect(r.jaccard).toBeLessThan(0.4);
    expect(r.coverageA).toBe(1);
    expect(r.similarityScore).toBe(1);
  });
  test('the metric is symmetric in score and swaps coverageA/coverageB', () => {
    const A = fps(1, 2, 3, 4, 5, 6, 7); const B = fps(5, 6, 7, 8, 9, 10);
    const ab = compareFingerprints(A, B, { minFingerprints: 1 }); const ba = compareFingerprints(B, A, { minFingerprints: 1 });
    expect(ab.similarityScore).toBe(ba.similarityScore);
    expect(ab.coverageA).toBe(ba.coverageB);
  });
  test('repeated hashes inside one file are counted once (set semantics)', () => {
    const r = compareFingerprints(fps(1, 1, 1, 2, 3, 4, 5), fps(1, 2, 3, 4, 5), { minFingerprints: 1 });
    expect(r.fingerprintCountA).toBe(5);
    expect(r.similarityScore).toBe(1);
  });
  test('files with too few fingerprints are not scored', () => {
    const r = compareFingerprints(fps(1, 2), fps(1, 2), { minFingerprints: 5 });
    expect(r.tooShort).toBe(true);
    expect(r.similarityScore).toBe(0);
  });
  test('empty inputs do not divide by zero', () => {
    const r = compareFingerprints([], [], { minFingerprints: 0 });
    expect(r).toMatchObject({ jaccard: 0, coverageA: 0, coverageB: 0, similarityScore: 0 });
  });
});
