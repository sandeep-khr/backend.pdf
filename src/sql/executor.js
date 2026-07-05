function evalExpr(node, row) {
  switch (node.type) {
    case 'literal': return node.value;
    case 'column':
      if (!(node.name in row)) throw new Error('Unknown column: ' + node.name);
      return row[node.name];
    case 'compare': {
      const l = evalExpr(node.left, row);
      const r = evalExpr(node.right, row);
      switch (node.op) {
        case '=': return l === r;
        case '<>': return l !== r;
        case '<': return l < r;
        case '<=': return l <= r;
        case '>': return l > r;
        case '>=': return l >= r;
        default: throw new Error('Unknown operator: ' + node.op);
      }
    }
    case 'logical':
      return node.op === 'and'
        ? (evalExpr(node.left, row) && evalExpr(node.right, row))
        : (evalExpr(node.left, row) || evalExpr(node.right, row));
    case 'not': return !evalExpr(node.expr, row);
    default: throw new Error('Cannot evaluate node: ' + node.type);
  }
}

function table(db, name) {
  const t = db.tables[name];
  if (!t) throw new Error('No such table: ' + name);
  return t;
}

function execute(ast, db) {
  switch (ast.type) {
    case 'create_table': {
      if (db.tables[ast.table]) throw new Error('Table already exists: ' + ast.table);
      db.tables[ast.table] = { columns: ast.columns.map(c => c.name), rows: [] };
      return { columns: [], rows: [], rowCount: 0, message: 'Table created: ' + ast.table };
    }
    case 'insert': {
      const t = table(db, ast.table);
      const cols = ast.columns || t.columns;
      let count = 0;
      for (const exprs of ast.rows) {
        if (exprs.length !== cols.length) throw new Error('Column count does not match value count');
        const row = {};
        for (const c of t.columns) row[c] = null;
        cols.forEach((c, idx) => {
          if (t.columns.indexOf(c) === -1) throw new Error('Unknown column: ' + c);
          row[c] = evalExpr(exprs[idx], {});
        });
        t.rows.push(row);
        count++;
      }
      return { columns: [], rows: [], rowCount: count, message: count + ' row(s) inserted' };
    }
    case 'select': {
      const t = table(db, ast.table);
      let rows = t.rows.filter(r => (ast.where ? evalExpr(ast.where, r) : true));
      if (ast.orderBy) {
        const { column, dir } = ast.orderBy;
        rows = rows.slice().sort((a, b) => {
          if (a[column] < b[column]) return dir === 'asc' ? -1 : 1;
          if (a[column] > b[column]) return dir === 'asc' ? 1 : -1;
          return 0;
        });
      }
      if (ast.limit != null) rows = rows.slice(0, ast.limit);
      const columns = ast.columns[0] === '*' ? t.columns.slice() : ast.columns;
      for (const c of columns) {
        if (t.columns.indexOf(c) === -1) throw new Error('Unknown column: ' + c);
      }
      const outRows = rows.map(r => columns.map(c => r[c]));
      return { columns, rows: outRows, rowCount: outRows.length, message: null };
    }
    case 'update': {
      const t = table(db, ast.table);
      let count = 0;
      for (const r of t.rows) {
        if (ast.where && !evalExpr(ast.where, r)) continue;
        for (const s of ast.set) {
          if (!(s.column in r)) throw new Error('Unknown column: ' + s.column);
          r[s.column] = evalExpr(s.value, r);
        }
        count++;
      }
      return { columns: [], rows: [], rowCount: count, message: count + ' row(s) updated' };
    }
    case 'delete': {
      const t = table(db, ast.table);
      const before = t.rows.length;
      t.rows = t.rows.filter(r => (ast.where ? !evalExpr(ast.where, r) : false));
      const removed = before - t.rows.length;
      return { columns: [], rows: [], rowCount: removed, message: removed + ' row(s) deleted' };
    }
    default: throw new Error('Cannot execute: ' + ast.type);
  }
}

module.exports = { execute, evalExpr };
