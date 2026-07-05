const { test } = require('node:test');
const assert = require('node:assert');
const { Database } = require('../src/db/database');
const todo = require('../src/app/todo');

test('ensureSchema seeds when empty and is idempotent', () => {
  const db = new Database();
  todo.ensureSchema(db);
  const first = todo.listTodos(db).rowCount;
  assert.ok(first >= 1);
  todo.ensureSchema(db);
  assert.strictEqual(todo.listTodos(db).rowCount, first);
});

test('addTodo appends with incrementing id and escapes quotes', () => {
  const db = new Database();
  todo.seed(db);
  const before = todo.listTodos(db).rowCount;
  const id = todo.addTodo(db, "o'brien's task");
  const rows = todo.listTodos(db).rows;
  assert.strictEqual(rows.length, before + 1);
  const added = rows.find(r => r[0] === id);
  assert.strictEqual(added[1], "o'brien's task");
  assert.strictEqual(added[2], 0);
});

test('toggleTodo flips done, deleteTodo removes', () => {
  const db = new Database();
  todo.seed(db);
  const id = todo.addTodo(db, 'x');
  todo.toggleTodo(db, id);
  assert.strictEqual(todo.listTodos(db).rows.find(r => r[0] === id)[2], 1);
  todo.toggleTodo(db, id);
  assert.strictEqual(todo.listTodos(db).rows.find(r => r[0] === id)[2], 0);
  todo.deleteTodo(db, id);
  assert.strictEqual(todo.listTodos(db).rows.find(r => r[0] === id), undefined);
});
