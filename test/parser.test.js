const { test } = require('node:test');
const assert = require('node:assert');
const { parse } = require('../src/sql/parser');

test('parses select with where, order, limit', () => {
  const ast = parse("select id, text from todos where done = 0 order by id desc limit 5");
  assert.strictEqual(ast.type, 'select');
  assert.deepStrictEqual(ast.columns, ['id', 'text']);
  assert.strictEqual(ast.table, 'todos');
  assert.deepStrictEqual(ast.orderBy, { column: 'id', dir: 'desc' });
  assert.strictEqual(ast.limit, 5);
  assert.strictEqual(ast.where.type, 'compare');
  assert.strictEqual(ast.where.op, '=');
  assert.deepStrictEqual(ast.where.left, { type: 'column', name: 'done' });
  assert.deepStrictEqual(ast.where.right, { type: 'literal', value: 0 });
});

test('parses select star', () => {
  assert.deepStrictEqual(parse("select * from t").columns, ['*']);
});

test('parses and/or precedence', () => {
  const w = parse("select * from t where a = 1 or b = 2 and c = 3").where;
  assert.strictEqual(w.op, 'or');
  assert.strictEqual(w.right.op, 'and');
});

test('parses create table', () => {
  const ast = parse("create table todos (id integer, text text, done integer)");
  assert.strictEqual(ast.type, 'create_table');
  assert.deepStrictEqual(ast.columns.map(c => c.name), ['id', 'text', 'done']);
});

test('parses insert with columns', () => {
  const ast = parse("insert into todos (id, text, done) values (1, 'hi', 0)");
  assert.strictEqual(ast.type, 'insert');
  assert.deepStrictEqual(ast.columns, ['id', 'text', 'done']);
  assert.strictEqual(ast.rows.length, 1);
  assert.deepStrictEqual(ast.rows[0][1], { type: 'literal', value: 'hi' });
});

test('parses update and delete', () => {
  const u = parse("update todos set done = 1 where id = 2");
  assert.strictEqual(u.type, 'update');
  assert.deepStrictEqual(u.set, [{ column: 'done', value: { type: 'literal', value: 1 } }]);
  const d = parse("delete from todos where id = 2");
  assert.strictEqual(d.type, 'delete');
});

test('rejects trailing garbage', () => {
  assert.throws(() => parse("select * from t garbage"));
});
