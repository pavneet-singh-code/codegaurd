const { fingerprint, kgramHashes, winnow, hashKgram } = require('../../src/services/plagiarism/fingerprint');
const { tokenize } = require('../../src/services/plagiarism/tokenizer');

const toks = (n) => Array.from({ length: n }, (_, i) => ({ value: `t${i % 7}`, line: 1 }));

describe('fingerprinting', () => {
  test('hash is deterministic and 32-bit', () => {
    const h = hashKgram(['a', 'b', 'c']);
    expect(h).toBe(hashKgram(['a', 'b', 'c']));
    expect(h).not.toBe(hashKgram(['a', 'b', 'd']));
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
  });
  test('produces n - k + 1 k-grams', () => {
    expect(kgramHashes(toks(20), 5)).toHaveLength(16);
    expect(kgramHashes(toks(4), 5)).toHaveLength(0);
  });
  test('winnowing keeps a subset, at most one fingerprint per window position, and no duplicates by position', () => {
    const hashes = kgramHashes(tokenize('int a = 1; int b = a + 2; if (b > 2) { b--; } return b;', 'java'), 3);
    const fp = winnow(hashes, 4);
    expect(fp.length).toBeGreaterThan(0);
    expect(fp.length).toBeLessThan(hashes.length);
    expect(new Set(fp.map((f) => f.pos)).size).toBe(fp.length);
  });
  test('window guarantee: a shared run of w + k - 1 tokens always shares a fingerprint', () => {
    const k = 4; const w = 5; const shared = tokenize('while ( i < n ) { sum += i ; i ++ ; }', 'java'); // 17+ tokens
    expect(shared.length).toBeGreaterThanOrEqual(w + k - 1);
    for (const prefix of ['int x = 0 ;', 'String q = "z" ; foo ( ) ;', 'return ;']) {
      const a = fingerprint([...tokenize(prefix, 'java'), ...shared], { kgramSize: k, windowSize: w });
      const b = fingerprint([...shared, ...tokenize('x = y ;', 'java')], { kgramSize: k, windowSize: w });
      const hb = new Set(b.map((f) => f.hash));
      expect(a.some((f) => hb.has(f.hash))).toBe(true);
    }
  });
  test('parameters are configurable and validated', () => {
    const t = toks(60);
    expect(fingerprint(t, { kgramSize: 3, windowSize: 2 }).length).toBeGreaterThan(fingerprint(t, { kgramSize: 3, windowSize: 10 }).length);
    expect(() => fingerprint(t, { kgramSize: 0, windowSize: 4 })).toThrow();
    expect(() => fingerprint(t, { kgramSize: 5, windowSize: 1.5 })).toThrow();
  });
  test('short input fewer than k tokens gives no fingerprints', () => {
    expect(fingerprint(toks(3), { kgramSize: 5, windowSize: 4 })).toEqual([]);
  });
});
