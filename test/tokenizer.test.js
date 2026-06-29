const { test } = require('node:test');
const assert = require('node:assert');
const { tokenize } = require('../src/sql/tokenizer');

test('tokenizes a select with where', () => {
  const t = tokenize("SELECT * FROM todos WHERE id = 1;");
  assert.deepStrictEqual(t.map(x => [x.type, x.value]), [
    ['keyword', 'select'], ['star', '*'], ['keyword', 'from'], ['ident', 'todos'],
    ['keyword', 'where'], ['ident', 'id'], ['op', '='], ['number', 1],
    ['punct', ';'], ['eof', null],
  ]);
});

test('tokenizes strings with escaped quotes and skips comments', () => {
  const t = tokenize("insert into t values ('a''b') -- note\n");
  const str = t.find(x => x.type === 'string');
  assert.strictEqual(str.value, "a'b");
  assert.ok(!t.some(x => x.value === 'note'));
});

test('tokenizes multi-char operators', () => {
  assert.strictEqual(tokenize("a <= b")[1].value, '<=');
  assert.strictEqual(tokenize("a <> b")[1].value, '<>');
  assert.strictEqual(tokenize("a != b")[1].value, '<>');
  assert.strictEqual(tokenize("a >= b")[1].value, '>=');
});

test('throws on unterminated string', () => {
  assert.throws(() => tokenize("select 'oops"));
});
