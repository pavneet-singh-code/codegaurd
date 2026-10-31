const { tokenize, supportedLanguages } = require('../../src/services/plagiarism/tokenizer');

const values = (src, lang) => tokenize(src, lang).map((t) => t.value);

describe('tokenizer (Java)', () => {
  test('normalises identifiers and numbers but keeps keywords and operators', () => {
    expect(values('int result = a + b;', 'java')).toEqual(['int', 'ID', '=', 'ID', '+', 'ID', ';']);
    expect(values('if (x >= 10 && y != 0) return;', 'java'))
      .toEqual(['if', '(', 'ID', '>=', 'NUM', '&&', 'ID', '!=', 'NUM', ')', 'return', ';']);
  });
  test('removes line and block comments but keeps line numbers correct', () => {
    const toks = tokenize('// header\nint a; /* multi\nline */ int b;\n', 'java');
    expect(toks.map((t) => t.value)).toEqual(['int', 'ID', ';', 'int', 'ID', ';']);
    expect(toks.map((t) => t.line)).toEqual([2, 2, 2, 3, 3, 3]);
  });
  test('comment markers inside strings are not comments', () => {
    expect(values('String s = "http://x // not a comment"; int n;', 'java'))
      .toEqual(['ID', 'ID', '=', 'STR', ';', 'int', 'ID', ';']);
  });
  test('escaped quotes and char literals', () => {
    expect(values(`String s = "a\\"b"; char c = '\\'';`, 'java')).toEqual(['ID', 'ID', '=', 'STR', ';', 'char', 'ID', '=', 'CHAR', ';']);
  });
  test('different control flow produces different tokens', () => {
    expect(values('while (i < n) { i++; }', 'java')).not.toEqual(values('for (i = 0; i < n; i++) { }', 'java'));
  });
  test('contextual keywords such as "record" are ordinary identifiers', () => {
    expect(values('void record(int x)', 'java')).toEqual(['void', 'ID', '(', 'int', 'ID', ')']);
  });
});

describe('tokenizer (Python)', () => {
  test('emits NEWLINE / INDENT / DEDENT for block structure', () => {
    expect(values('def f(x):\n    if x:\n        return 1\n    return 2\n', 'python')).toEqual(
      ['def', 'ID', '(', 'ID', ')', ':', 'NEWLINE', 'INDENT', 'if', 'ID', ':', 'NEWLINE', 'INDENT', 'return', 'NUM', 'NEWLINE',
        'DEDENT', 'return', 'NUM', 'NEWLINE', 'DEDENT']
    );
  });
  test('ignores comments, blank lines, docstrings and extra spaces', () => {
    const plain = values('x = 1\nif x:\n    y = 2\n', 'python');
    const noisy = values('# c\n\nx   =  1  # trailing\nif  x :\n\n    """doc"""\n    y=2\n', 'python');
    expect(noisy).toEqual(plain);
  });
  test('newlines inside brackets do not end the statement', () => {
    expect(values('a = [1,\n     2,\n     3]\nb = 4\n', 'python')).toEqual(
      ['ID', '=', '[', 'NUM', ',', 'NUM', ',', 'NUM', ']', 'NEWLINE', 'ID', '=', 'NUM', 'NEWLINE']);
  });
  test('string prefixes, triple-quoted strings inside expressions, multi-char operators', () => {
    expect(values('s = f"x{y}" + r\'a\'\nn //= 2 ** 3\n', 'python')).toEqual(
      ['ID', '=', 'STR', '+', 'STR', 'NEWLINE', 'ID', '//=', 'NUM', '**', 'NUM', 'NEWLINE']);
  });
  test('Windows line endings behave like Unix ones', () => {
    expect(values('if x:\r\n    y = 1\r\n', 'python')).toEqual(values('if x:\n    y = 1\n', 'python'));
  });
});

describe('tokenizer (general)', () => {
  test('rejects unsupported languages', () => {
    expect(() => tokenize('x', 'cobol')).toThrow(/Unsupported language/);
    expect(supportedLanguages().sort()).toEqual(['java', 'python']);
  });
  test('empty input gives no tokens', () => {
    expect(tokenize('', 'java')).toEqual([]);
    expect(tokenize('   \n\n', 'python')).toEqual([]);
  });
});
