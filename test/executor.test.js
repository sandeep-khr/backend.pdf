const { test } = require('node:test');
const assert = require('node:assert');
const { parse } = require('../src/sql/parser');
const { execute } = require('../src/sql/executor');

function freshDb() { return { tables: {} }; }
function run(db, sql) { return execute(parse(sql), db); }

test('create, insert, select roundtrip', () => {
  const db = freshDb();
  run(db, "create table todos (id integer, text text, done integer)");
  run(db, "insert into todos (id, text, done) values (1, 'a', 0)");
  run(db, "insert into todos (id, text, done) values (2, 'b', 1)");
  const res = run(db, "select id, text from todos where done = 0");
  assert.deepStrictEqual(res.columns, ['id', 'text']);
  assert.deepStrictEqual(res.rows, [[1, 'a']]);
  assert.strictEqual(res.rowCount, 1);
});

test('select star returns all columns', () => {
  const db = freshDb();
  run(db, "create table t (a integer, b integer)");
  run(db, "insert into t (a, b) values (1, 2)");
  const res = run(db, "select * from t");
  assert.deepStrictEqual(res.columns, ['a', 'b']);
  assert.deepStrictEqual(res.rows, [[1, 2]]);
});

test('order by and limit', () => {
  const db = freshDb();
  run(db, "create table t (n integer)");
  [3, 1, 2].forEach(n => run(db, `insert into t (n) values (${n})`));
  assert.deepStrictEqual(run(db, "select n from t order by n asc").rows, [[1], [2], [3]]);
  assert.deepStrictEqual(run(db, "select n from t order by n desc limit 2").rows, [[3], [2]]);
});

test('update and delete with where', () => {
  const db = freshDb();
  run(db, "create table t (id integer, done integer)");
  run(db, "insert into t (id, done) values (1, 0)");
  run(db, "insert into t (id, done) values (2, 0)");
  const u = run(db, "update t set done = 1 where id = 1");
  assert.strictEqual(u.rowCount, 1);
  assert.deepStrictEqual(run(db, "select done from t where id = 1").rows, [[1]]);
  const d = run(db, "delete from t where id = 2");
  assert.strictEqual(d.rowCount, 1);
  assert.strictEqual(run(db, "select * from t").rowCount, 1);
});

test('errors surface as exceptions', () => {
  const db = freshDb();
  assert.throws(() => run(db, "select * from nope"));
  run(db, "create table t (a integer)");
  assert.throws(() => run(db, "select missing from t"));
});
