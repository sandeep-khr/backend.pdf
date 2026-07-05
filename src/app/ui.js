const { Database } = require('../db/database');
const todo = require('./todo');

const FIELDS = {
  state: 'state',
  todoList: 'todo_list',
  newTodo: 'new_todo',
  sqlInput: 'sql_input',
  sqlOutput: 'sql_output',
  actionId: 'action_id',
};

function load(doc) {
  const db = Database.deserialize(doc.getField(FIELDS.state).value);
  todo.ensureSchema(db);
  return db;
}

function save(doc, db) {
  doc.getField(FIELDS.state).value = db.serialize();
}

function renderTodos(doc, db) {
  const rows = todo.listTodos(db).rows;
  const lines = rows.map(r => '[' + (r[2] ? 'x' : ' ') + '] #' + r[0] + ' ' + r[1]);
  doc.getField(FIELDS.todoList).value = lines.length ? lines.join('\n') : '(no todos yet)';
}

function formatResult(res) {
  if (!res.columns.length) return res.message || 'OK';
  const header = res.columns.join(' | ');
  const sep = res.columns.map(() => '---').join(' | ');
  const body = res.rows.map(r => r.map(v => (v === null ? 'NULL' : String(v))).join(' | '));
  return [header, sep].concat(body).join('\n') +
    '\n(' + res.rowCount + ' row' + (res.rowCount === 1 ? '' : 's') + ')';
}

function init(doc) {
  const db = load(doc);
  save(doc, db);
  renderTodos(doc, db);
}

function onAdd(doc) {
  const db = load(doc);
  const text = (doc.getField(FIELDS.newTodo).value || '').replace(/^\s+|\s+$/g, '');
  if (text) { todo.addTodo(db, text); doc.getField(FIELDS.newTodo).value = ''; }
  save(doc, db);
  renderTodos(doc, db);
}

function onRunSql(doc) {
  const db = load(doc);
  const sql = (doc.getField(FIELDS.sqlInput).value || '').replace(/^\s+|\s+$/g, '');
  let out;
  try { out = formatResult(db.run(sql)); }
  catch (e) { out = 'Error: ' + (e && e.message ? e.message : e); }
  doc.getField(FIELDS.sqlOutput).value = out;
  save(doc, db);
  renderTodos(doc, db);
}

function actionId(doc) {
  const v = parseInt(doc.getField(FIELDS.actionId).value, 10);
  return isNaN(v) ? null : v;
}

function onToggle(doc) {
  const db = load(doc);
  const id = actionId(doc);
  if (id != null) todo.toggleTodo(db, id);
  save(doc, db);
  renderTodos(doc, db);
}

function onDelete(doc) {
  const db = load(doc);
  const id = actionId(doc);
  if (id != null) todo.deleteTodo(db, id);
  save(doc, db);
  renderTodos(doc, db);
}

module.exports = { FIELDS, load, save, renderTodos, formatResult, init, onAdd, onRunSql, onToggle, onDelete };
