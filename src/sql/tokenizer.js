const KEYWORDS = new Set([
  'create', 'table', 'insert', 'into', 'values', 'select', 'from', 'where',
  'order', 'by', 'asc', 'desc', 'limit', 'update', 'set', 'delete',
  'and', 'or', 'not', 'null', 'true', 'false',
]);

function tokenize(sql) {
  const tokens = [];
  let i = 0;
  const isDigit = c => c >= '0' && c <= '9';
  const isIdentStart = c => /[A-Za-z_]/.test(c);
  const isIdent = c => /[A-Za-z0-9_]/.test(c);

  while (i < sql.length) {
    const c = sql[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
    if (c === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++;
      continue;
    }
    if (c === ',' || c === '(' || c === ')' || c === ';') {
      tokens.push({ type: 'punct', value: c }); i++; continue;
    }
    if (c === '*') { tokens.push({ type: 'star', value: '*' }); i++; continue; }
    if (c === '=') { tokens.push({ type: 'op', value: '=' }); i++; continue; }
    if (c === '!' && sql[i + 1] === '=') { tokens.push({ type: 'op', value: '<>' }); i += 2; continue; }
    if (c === '<') {
      if (sql[i + 1] === '=') { tokens.push({ type: 'op', value: '<=' }); i += 2; }
      else if (sql[i + 1] === '>') { tokens.push({ type: 'op', value: '<>' }); i += 2; }
      else { tokens.push({ type: 'op', value: '<' }); i++; }
      continue;
    }
    if (c === '>') {
      if (sql[i + 1] === '=') { tokens.push({ type: 'op', value: '>=' }); i += 2; }
      else { tokens.push({ type: 'op', value: '>' }); i++; }
      continue;
    }
    if (c === "'") {
      let s = ''; i++;
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") { s += "'"; i += 2; continue; }
        if (sql[i] === "'") break;
        s += sql[i]; i++;
      }
      if (sql[i] !== "'") throw new Error('Unterminated string literal');
      i++;
      tokens.push({ type: 'string', value: s });
      continue;
    }
    if (isDigit(c) || (c === '.' && isDigit(sql[i + 1]))) {
      let n = '';
      while (i < sql.length && (isDigit(sql[i]) || sql[i] === '.')) { n += sql[i]; i++; }
      tokens.push({ type: 'number', value: parseFloat(n) });
      continue;
    }
    if (isIdentStart(c)) {
      let id = '';
      while (i < sql.length && isIdent(sql[i])) { id += sql[i]; i++; }
      const lower = id.toLowerCase();
      tokens.push(KEYWORDS.has(lower) ? { type: 'keyword', value: lower } : { type: 'ident', value: id });
      continue;
    }
    throw new Error('Unexpected character: ' + c);
  }
  tokens.push({ type: 'eof', value: null });
  return tokens;
}

module.exports = { tokenize, KEYWORDS };
