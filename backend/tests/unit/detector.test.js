const { compareSources, comparePairs, explainPair } = require('../../src/services/plagiarism');
const { fixture } = require('../helpers/api-free-fixture');

const J = (n) => fixture('java', n);
const P = (n) => fixture('python', n);
const score = (a, b, lang) => compareSources(a, b, lang).similarityScore;

describe('detector on real sample programs (Java)', () => {
  const original = J('GradeBook_original.java');
  test('identical program scores 1', () => expect(score(original, J('GradeBook_identical.java'), 'java')).toBe(1));
  test('different formatting, comments and brace style still score 1', () => expect(score(original, J('GradeBook_reformatted.java'), 'java')).toBe(1));
  test('renamed class, methods and variables still score 1', () => expect(score(original, J('GradeBook_renamed.java'), 'java')).toBe(1));
  test('small logic modifications lower the score but it stays high', () => {
    const s = score(original, J('GradeBook_modified.java'), 'java');
    expect(s).toBeLessThan(1);
    expect(s).toBeGreaterThan(0.6);
  });
  test('independent solution to the same task scores clearly lower than a modified copy', () => {
    const indep = score(original, J('GradeBook_independent.java'), 'java');
    expect(indep).toBeLessThan(score(original, J('GradeBook_modified.java'), 'java'));
    expect(indep).toBeLessThan(0.4);
  });
  test('a completely different program scores low', () => expect(score(original, J('Palindrome_different.java'), 'java')).toBeLessThan(0.3));
});

describe('detector on real sample programs (Python)', () => {
  const original = P('wordcount_original.py');
  test('identical, reformatted and renamed copies score 1', () => {
    for (const f of ['wordcount_identical.py', 'wordcount_reformatted.py', 'wordcount_renamed.py']) expect(score(original, P(f), 'python')).toBe(1);
  });
  test('modified copy is between independent and identical', () => {
    const s = score(original, P('wordcount_modified.py'), 'python');
    expect(s).toBeLessThan(1);
    expect(s).toBeGreaterThan(0.5);
  });
  test('independent and different programs score low', () => {
    expect(score(original, P('wordcount_independent.py'), 'python')).toBeLessThan(0.4);
    expect(score(original, P('fibonacci_different.py'), 'python')).toBeLessThan(0.3);
  });
});

describe('pairwise comparison of a whole set', () => {
  const entries = ['GradeBook_original.java', 'GradeBook_renamed.java', 'GradeBook_independent.java', 'Palindrome_different.java', 'GradeBook_modified.java']
    .map((f) => ({ id: f, language: 'java', text: J(f) }));
  const pairs = comparePairs(entries);
  test('compares n(n-1)/2 unique pairs and never a file with itself', () => {
    expect(pairs).toHaveLength((5 * 4) / 2);
    expect(pairs.every((p) => p.a !== p.b)).toBe(true);
    expect(new Set(pairs.map((p) => [p.a, p.b].sort().join('|'))).size).toBe(10);
  });
  test('the most similar pair is the original/renamed copy', () => {
    const top = [...pairs].sort((x, y) => y.similarityScore - x.similarityScore)[0];
    expect([top.a, top.b].sort()).toEqual(['GradeBook_original.java', 'GradeBook_renamed.java']);
  });
  test('parameters are configurable (larger k-grams are stricter)', () => {
    const loose = compareSources(J('GradeBook_original.java'), J('GradeBook_independent.java'), 'java', { kgramSize: 3 }).similarityScore;
    const strict = compareSources(J('GradeBook_original.java'), J('GradeBook_independent.java'), 'java', { kgramSize: 9 }).similarityScore;
    expect(strict).toBeLessThan(loose);
  });
});

describe('matching regions', () => {
  const opts = { kgramSize: 5, windowSize: 4 };
  test('identical files: one region covering the whole file', () => {
    const text = J('GradeBook_original.java');
    const info = explainPair(text, text, 'java', opts);
    expect(info.regions[0].tokenCount).toBe(info.tokenCountA);
    expect(info.regions[0].aStartLine).toBe(1);
    expect(info.regions[0].aEndLine).toBe(text.trimEnd().split('\n').length);
    expect(info.matchedTokensA).toBe(info.tokenCountA);
  });
  test('every reported region is an exact token match and its line range covers those tokens', () => {
    const { tokenize } = require('../../src/services/plagiarism');
    const a = J('GradeBook_original.java'); const b = J('GradeBook_modified.java');
    const info = explainPair(a, b, 'java', opts);
    expect(info.regions.length).toBeGreaterThan(1);
    const tokA = tokenize(a, 'java'); const tokB = tokenize(b, 'java');
    const totalLinesA = a.split('\n').length; const totalLinesB = b.split('\n').length;
    for (const r of info.regions) {
      expect(r.tokenCount).toBeGreaterThanOrEqual(opts.kgramSize);
      for (let o = 0; o < r.tokenCount; o++) expect(tokA[r.aTokenStart + o].value).toBe(tokB[r.bTokenStart + o].value);
      expect(r.aStartLine).toBe(tokA[r.aTokenStart].line);
      expect(r.aEndLine).toBe(tokA[r.aTokenStart + r.tokenCount - 1].line);
      expect(r.bStartLine).toBe(tokB[r.bTokenStart].line);
      expect(r.aEndLine).toBeLessThanOrEqual(totalLinesA);
      expect(r.bEndLine).toBeLessThanOrEqual(totalLinesB);
    }
  });
  test('the modified copy keeps the unchanged highest() method as a matching region', () => {
    const a = J('GradeBook_original.java'); const b = J('GradeBook_modified.java');
    const info = explainPair(a, b, 'java', opts);
    const lines = a.split('\n');
    const hit = info.regions.some((r) => lines.slice(r.aStartLine - 1, r.aEndLine).join('\n').includes('Integer.MIN_VALUE'));
    expect(hit).toBe(true);
  });
  test('unrelated programs share only short regions', () => {
    const info = explainPair(J('GradeBook_original.java'), J('Palindrome_different.java'), 'java', opts);
    expect(info.matchedTokensA / info.tokenCountA).toBeLessThan(0.4);
  });
});
