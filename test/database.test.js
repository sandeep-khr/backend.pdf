const { test } = require('node:test');
const assert = require('node:assert');
const { Database } = require('../src/db/database');

test('run executes SQL against itself', () => {
  const db = new Database();
  db.run("create table t (a integer)");
  db.run("insert into t (a) values (7)");
  assert.deepStrictEqual(db.run("select a from t").rows, [[7]]);
});

test('serialize then deserialize preserves data', () => {
  const db = new Database();
  db.run("create table todos (id integer, text text, done integer)");
  db.run("insert into todos (id, text, done) values (1, 'buy milk', 0)");
  const blob = db.serialize();
  const back = Database.deserialize(blob);
  assert.deepStrictEqual(back.run("select text from todos").rows, [['buy milk']]);
});

test('deserialize handles empty and corrupt input', () => {
  assert.deepStrictEqual(Database.deserialize('').tables, {});
  assert.deepStrictEqual(Database.deserialize('not json{').tables, {});
  assert.deepStrictEqual(Database.deserialize(undefined).tables, {});
});
