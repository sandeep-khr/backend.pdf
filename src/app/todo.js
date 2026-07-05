function seed(db) {
  db.run("create table todos (id integer, text text, done integer)");
  db.run("insert into todos (id, text, done) values (1, 'try the SQL console below', 0)");
  db.run("insert into todos (id, text, done) values (2, 'this whole app is one PDF file', 0)");
}

function ensureSchema(db) {
  if (!db.tables.todos) seed(db);
}

function nextId(db) {
  const res = db.run("select id from todos order by id desc limit 1");
  return res.rows.length ? res.rows[0][0] + 1 : 1;
}

function listTodos(db) {
  return db.run("select id, text, done from todos order by id asc");
}

function addTodo(db, text) {
  const id = nextId(db);
  const safe = String(text).replace(/'/g, "''");
  db.run("insert into todos (id, text, done) values (" + id + ", '" + safe + "', 0)");
  return id;
}

function toggleTodo(db, id) {
  const res = db.run("select done from todos where id = " + id);
  if (!res.rows.length) return;
  const cur = res.rows[0][0];
  db.run("update todos set done = " + (cur ? 0 : 1) + " where id = " + id);
}

function deleteTodo(db, id) {
  db.run("delete from todos where id = " + id);
}

module.exports = { seed, ensureSchema, nextId, listTodos, addTodo, toggleTodo, deleteTodo };
