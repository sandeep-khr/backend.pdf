const { tokenize } = require('./tokenizer');

function parse(sql) {
  const tokens = tokenize(sql);
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function expect(type, value) {
    const t = next();
    if (t.type !== type || (value !== undefined && t.value !== value)) {
      throw new Error('Expected ' + (value || type) + ', got ' + t.value);
    }
    return t;
  }
  function accept(type, value) {
    const t = peek();
    if (t.type === type && (value === undefined || t.value === value)) { pos++; return true; }
    return false;
  }
  function isKw(v) { return peek().type === 'keyword' && peek().value === v; }

  function parsePrimary() {
    const t = peek();
    if (t.type === 'number' || t.type === 'string') { next(); return { type: 'literal', value: t.value }; }
    if (t.type === 'keyword' && t.value === 'null') { next(); return { type: 'literal', value: null }; }
    if (t.type === 'keyword' && (t.value === 'true' || t.value === 'false')) {
      next(); return { type: 'literal', value: t.value === 'true' };
    }
    if (t.type === 'ident') { next(); return { type: 'column', name: t.value }; }
    if (t.type === 'punct' && t.value === '(') { next(); const e = parseExpr(); expect('punct', ')'); return e; }
    throw new Error('Unexpected token in expression: ' + t.value);
  }
  function parseCompare() {
    const left = parsePrimary();
    if (peek().type === 'op') { const op = next().value; return { type: 'compare', op, left, right: parsePrimary() }; }
    return left;
  }
  function parseNot() {
    if (isKw('not')) { next(); return { type: 'not', expr: parseNot() }; }
    return parseCompare();
  }
  function parseAnd() {
    let left = parseNot();
    while (isKw('and')) { next(); left = { type: 'logical', op: 'and', left, right: parseNot() }; }
    return left;
  }
  function parseExpr() {
    let left = parseAnd();
    while (isKw('or')) { next(); left = { type: 'logical', op: 'or', left, right: parseAnd() }; }
    return left;
  }

  function parseCreate() {
    expect('keyword', 'create'); expect('keyword', 'table');
    const table = expect('ident').value;
    expect('punct', '(');
    const columns = [];
    do {
      const name = expect('ident').value;
      let colType = 'text';
      if (peek().type === 'ident' || peek().type === 'keyword') colType = String(next().value).toLowerCase();
      columns.push({ name, type: colType });
    } while (accept('punct', ','));
    expect('punct', ')');
    return { type: 'create_table', table, columns };
  }
  function parseInsert() {
    expect('keyword', 'insert'); expect('keyword', 'into');
    const table = expect('ident').value;
    let columns = null;
    if (accept('punct', '(')) {
      columns = [];
      do { columns.push(expect('ident').value); } while (accept('punct', ','));
      expect('punct', ')');
    }
    expect('keyword', 'values');
    const rows = [];
    do {
      expect('punct', '(');
      const vals = [];
      do { vals.push(parseExpr()); } while (accept('punct', ','));
      expect('punct', ')');
      rows.push(vals);
    } while (accept('punct', ','));
    return { type: 'insert', table, columns, rows };
  }
  function parseSelect() {
    expect('keyword', 'select');
    let columns;
    if (accept('star')) columns = ['*'];
    else {
      columns = [];
      do { columns.push(expect('ident').value); } while (accept('punct', ','));
    }
    expect('keyword', 'from');
    const table = expect('ident').value;
    let where = null;
    if (accept('keyword', 'where')) where = parseExpr();
    let orderBy = null;
    if (accept('keyword', 'order')) {
      expect('keyword', 'by');
      const column = expect('ident').value;
      let dir = 'asc';
      if (accept('keyword', 'desc')) dir = 'desc'; else accept('keyword', 'asc');
      orderBy = { column, dir };
    }
    let limit = null;
    if (accept('keyword', 'limit')) limit = expect('number').value;
    return { type: 'select', columns, table, where, orderBy, limit };
  }
  function parseUpdate() {
    expect('keyword', 'update');
    const table = expect('ident').value;
    expect('keyword', 'set');
    const set = [];
    do {
      const column = expect('ident').value;
      expect('op', '=');
      set.push({ column, value: parseExpr() });
    } while (accept('punct', ','));
    let where = null;
    if (accept('keyword', 'where')) where = parseExpr();
    return { type: 'update', table, set, where };
  }
  function parseDelete() {
    expect('keyword', 'delete'); expect('keyword', 'from');
    const table = expect('ident').value;
    let where = null;
    if (accept('keyword', 'where')) where = parseExpr();
    return { type: 'delete', table, where };
  }

  function parseStatement() {
    const t = peek();
    if (t.type !== 'keyword') throw new Error('Expected a statement, got ' + t.value);
    switch (t.value) {
      case 'create': return parseCreate();
      case 'insert': return parseInsert();
      case 'select': return parseSelect();
      case 'update': return parseUpdate();
      case 'delete': return parseDelete();
      default: throw new Error('Unsupported statement: ' + t.value);
    }
  }

  const stmt = parseStatement();
  accept('punct', ';');
  if (peek().type !== 'eof') throw new Error('Unexpected token after statement: ' + peek().value);
  return stmt;
}

module.exports = { parse };
