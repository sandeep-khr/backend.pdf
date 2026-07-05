const { test } = require('node:test');
const assert = require('node:assert');
const { createDoc } = require('../src/runtime/acrobat-shim');
const ui = require('../src/app/ui');

const NAMES = Object.values(ui.FIELDS);

test('init seeds, renders todos, and writes state', () => {
  const doc = createDoc(NAMES);
  ui.init(doc);
  assert.ok(doc.getField('todo_list').value.includes('SQL console'));
  assert.ok(doc.getField('state').value.length > 0);
});

test('onAdd adds a todo and clears the input', () => {
  const doc = createDoc(NAMES);
  ui.init(doc);
  doc.getField('new_todo').value = 'walk the dog';
  ui.onAdd(doc);
  assert.ok(doc.getField('todo_list').value.includes('walk the dog'));
  assert.strictEqual(doc.getField('new_todo').value, '');
});

test('onRunSql renders a result table', () => {
  const doc = createDoc(NAMES);
  ui.init(doc);
  doc.getField('sql_input').value = 'select id, text from todos';
  ui.onRunSql(doc);
  const out = doc.getField('sql_output').value;
  assert.ok(out.includes('id | text'));
  assert.ok(out.includes('row'));
});

test('onRunSql shows errors instead of throwing', () => {
  const doc = createDoc(NAMES);
  ui.init(doc);
  doc.getField('sql_input').value = 'select * from missing';
  ui.onRunSql(doc);
  assert.ok(doc.getField('sql_output').value.startsWith('Error:'));
});

test('state persists across a reload', () => {
  const doc = createDoc(NAMES);
  ui.init(doc);
  doc.getField('new_todo').value = 'persist me';
  ui.onAdd(doc);
  const saved = doc.getField('state').value;

  const reopened = createDoc(NAMES);
  reopened.getField('state').value = saved;
  ui.init(reopened);
  assert.ok(reopened.getField('todo_list').value.includes('persist me'));
});

test('onToggle and onDelete act on action_id', () => {
  const doc = createDoc(NAMES);
  ui.init(doc);
  doc.getField('new_todo').value = 'temp';
  ui.onAdd(doc);
  const line = doc.getField('todo_list').value.split('\n').find(l => l.includes('temp'));
  const id = parseInt(line.match(/#(\d+)/)[1], 10);

  doc.getField('action_id').value = String(id);
  ui.onToggle(doc);
  assert.ok(doc.getField('todo_list').value.split('\n').find(l => l.includes('temp')).includes('[x]'));

  doc.getField('action_id').value = String(id);
  ui.onDelete(doc);
  assert.ok(!doc.getField('todo_list').value.includes('temp'));
});
