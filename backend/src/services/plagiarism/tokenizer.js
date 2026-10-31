/**
 * Language-aware tokenizer for Java and Python.
 *
 * It is a hand-written scanner, NOT a full parser. For every token it keeps a canonical
 * `value` (used for fingerprinting) and the original `line` (used to report matching regions).
 *
 * Normalisation rules:
 *   - comments are dropped; whitespace is ignored (Python indentation becomes INDENT/DEDENT/NEWLINE)
 *   - identifiers (variables, methods, classes)   -> ID
 *   - numeric literals -> NUM, string literals -> STR, Java char literals -> CHAR
 *   - keywords and operators/punctuation are kept as they are, so control flow and logic still matter
 *
 * Known limitations (also listed in the README): no macro/annotation awareness, f-string
 * expressions are treated as plain strings, generics such as `List<int>` are tokenised as
 * operators, and standalone Python triple-quoted strings (docstrings) are ignored.
 */

const JAVA_KEYWORDS = new Set(('abstract assert boolean break byte case catch char class const continue default do double ' +
  'else enum extends final finally float for goto if implements import instanceof int interface long native new package ' +
  'private protected public return short static strictfp super switch synchronized this throw throws transient try void ' +
  'volatile while true false null').split(' '));

const PY_KEYWORDS = new Set(('False None True and as assert async await break class continue def del elif else except ' +
  'finally for from global if import in is lambda nonlocal not or pass raise return try while with yield').split(' '));

const byLength = (ops) => [...ops].sort((a, b) => b.length - a.length);

const LANGUAGES = {
  java: {
    keywords: JAVA_KEYWORDS,
    operators: byLength(['>>>=', '<<=', '>>=', '>>>', '...', '->', '::', '++', '--', '&&', '||', '==', '!=', '<=', '>=',
      '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<', '>>']),
    lineComment: '//', blockComment: true, indentation: false, stringPrefixes: new Set(),
  },
  python: {
    keywords: PY_KEYWORDS,
    operators: byLength(['**=', '//=', '>>=', '<<=', '->', ':=', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%=',
      '&=', '|=', '^=', '//', '**', '<<', '>>', '@=']),
    lineComment: '#', blockComment: false, indentation: true,
    stringPrefixes: new Set(['r', 'u', 'b', 'f', 'br', 'rb', 'fr', 'rf']),
  },
};

const NUMBER_RE = /0[xX][0-9a-fA-F_]+[lL]?|0[bB][01_]+[lL]?|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d+)?[lLfFdDjJ]?/y;
const IDENT_RE = /[\p{L}_$][\p{L}\p{N}_$]*/uy;
const OPEN = new Set(['(', '[', '{']);
const CLOSE = new Set([')', ']', '}']);

function supportedLanguages() { return Object.keys(LANGUAGES); }

function scan(text, cfg, isPython) {
  const raw = [];
  let i = 0;
  let line = 1;
  let lineStart = 0;
  let lineHasToken = false;

  const column = (idx) => {
    let col = 0;
    for (let p = lineStart; p < idx; p++) col += text[p] === '\t' ? 8 - (col % 8) : 1;
    return col;
  };
  const push = (value, startIdx, extra = {}) => {
    const tok = { value, line: extra.line || line, ...extra };
    if (!lineHasToken) { tok.col = column(startIdx); lineHasToken = true; }
    raw.push(tok);
  };
  const newline = () => { line++; lineStart = i + 1; lineHasToken = false; };

  // Reads a quoted string starting at `i` (pointing at the opening quote). Returns the end index.
  const readString = (start) => {
    const q = text[start];
    const triple = text.startsWith(q.repeat(3), start) && (isPython || q === '"');
    const startLine = line;
    let j = start + (triple ? 3 : 1);
    while (j < text.length) {
      if (text[j] === '\\') { if (text[j + 1] === '\n') { line++; lineStart = j + 2; } j += 2; continue; }
      if (triple) {
        if (text.startsWith(q.repeat(3), j)) { j += 3; break; }
      } else if (text[j] === q) { j++; break; }
      else if (text[j] === '\n') break; // unterminated single-line string: stop at end of line
      if (text[j] === '\n') { line++; lineStart = j + 1; }
      j++;
    }
    return { end: j, triple, startLine };
  };

  while (i < text.length) {
    const ch = text[i];
    if (ch === '\n') { if (isPython) raw.push({ nl: true, line }); newline(); i++; continue; }
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\f') { i++; continue; }
    if (isPython && ch === '\\' && text[i + 1] === '\n') { i += 2; line++; lineStart = i; continue; } // line continuation

    // comments
    if (text.startsWith(cfg.lineComment, i)) { while (i < text.length && text[i] !== '\n') i++; continue; }
    if (cfg.blockComment && text.startsWith('/*', i)) {
      i += 2;
      while (i < text.length && !text.startsWith('*/', i)) { if (text[i] === '\n') newline(); i++; }
      i += 2;
      continue;
    }

    // strings
    if (ch === '"' || ch === "'") {
      const start = i;
      const { end, triple, startLine } = readString(i);
      push(!isPython && ch === "'" ? 'CHAR' : 'STR', start, { line: startLine, triple });
      i = end;
      continue;
    }

    // numbers
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(text[i + 1] || ''))) {
      NUMBER_RE.lastIndex = i;
      const m = NUMBER_RE.exec(text);
      if (m) { push('NUM', i); i += m[0].length; continue; }
    }

    // identifiers / keywords (and Python string prefixes such as r"..." or f'...')
    IDENT_RE.lastIndex = i;
    const id = IDENT_RE.exec(text);
    if (id) {
      const word = id[0];
      const next = text[i + word.length];
      if (isPython && cfg.stringPrefixes.has(word.toLowerCase()) && (next === '"' || next === "'")) {
        const start = i;
        const { end, triple, startLine } = readString(i + word.length);
        push('STR', start, { line: startLine, triple });
        i = end;
        continue;
      }
      push(cfg.keywords.has(word) ? word : 'ID', i);
      i += word.length;
      continue;
    }

    // operators and punctuation
    const op = cfg.operators.find((o) => text.startsWith(o, i));
    if (op) { push(op, i); i += op.length; continue; }
    push(ch, i);
    i++;
  }
  return raw;
}

// Turns Python's significant whitespace into explicit tokens.
function pythonStructure(raw) {
  const out = [];
  const stack = [0];
  let depth = 0;
  let lineTokens = false;
  for (const t of raw) {
    if (t.nl) {
      if (depth === 0 && lineTokens) { out.push({ value: 'NEWLINE', line: t.line }); lineTokens = false; }
      continue;
    }
    const startsLogicalLine = depth === 0 && !lineTokens;
    if (startsLogicalLine && t.triple) continue; // docstring-style statement
    if (startsLogicalLine) {
      if (t.col > stack[stack.length - 1]) { stack.push(t.col); out.push({ value: 'INDENT', line: t.line }); }
      else while (t.col < stack[stack.length - 1]) { stack.pop(); out.push({ value: 'DEDENT', line: t.line }); }
    }
    lineTokens = true;
    out.push({ value: t.value, line: t.line });
    if (OPEN.has(t.value)) depth++;
    else if (CLOSE.has(t.value)) depth = Math.max(0, depth - 1);
  }
  const lastLine = out.length ? out[out.length - 1].line : 1;
  if (lineTokens) out.push({ value: 'NEWLINE', line: lastLine });
  while (stack.length > 1) { stack.pop(); out.push({ value: 'DEDENT', line: lastLine }); }
  return out;
}

function tokenize(source, language) {
  const key = String(language || '').toLowerCase();
  const cfg = LANGUAGES[key];
  if (!cfg) throw new Error(`Unsupported language "${language}". Supported: ${supportedLanguages().join(', ')}`);
  const text = String(source).replace(/\r\n?/g, '\n');
  const raw = scan(text, cfg, cfg.indentation);
  if (cfg.indentation) return pythonStructure(raw);
  return raw.map((t) => ({ value: t.value, line: t.line }));
}

module.exports = { tokenize, supportedLanguages };
