const { test } = require('node:test');
const assert = require('node:assert');
const vm = require('node:vm');
const { buildBundle } = require('../build/bundle');
const { createDoc, app } = require('../src/runtime/acrobat-shim');

function evalBundleOnDoc(doc) {
  const src = buildBundle();
  vm.runInNewContext(
    '(function(){\n' + src + '\nreturn this;}).call(__doc);',
    { __doc: doc, app, console }
  );
  return doc;
}

test('bundle loads, seeds todos and exposes handlers on the doc', () => {
  const names = ['state', 'todo_list', 'new_todo', 'sql_input', 'sql_output', 'action_id'];
  const doc = createDoc(names);
  evalBundleOnDoc(doc);
  assert.ok(doc.getField('todo_list').value.includes('SQL console'));
  assert.strictEqual(typeof doc.onRunSql, 'function');

  doc.getField('sql_input').value = 'select id, text from todos';
  doc.onRunSql();
  assert.ok(doc.getField('sql_output').value.includes('id | text'));
});
