const fs = require('node:fs');
const path = require('node:path');

const SRC = path.join(__dirname, '..', 'src');

const MODULE_FILES = {
  'sql/tokenizer': 'sql/tokenizer.js',
  'sql/parser': 'sql/parser.js',
  'sql/executor': 'sql/executor.js',
  'db/database': 'db/database.js',
  'app/todo': 'app/todo.js',
  'app/ui': 'app/ui.js',
};

// pdf js has no require(), so ship a mini one
const RUNTIME = `
var __mods = {}, __cache = {};
function __resolve(from, r) {
  if (r.charAt(0) !== '.') return r;
  var dir = from.indexOf('/') >= 0 ? from.slice(0, from.lastIndexOf('/')) : '';
  var parts = dir ? dir.split('/') : [];
  var segs = r.split('/');
  for (var i = 0; i < segs.length; i++) {
    if (segs[i] === '.' || segs[i] === '') continue;
    else if (segs[i] === '..') parts.pop();
    else parts.push(segs[i]);
  }
  return parts.join('/');
}
function __require(id) {
  if (__cache[id]) return __cache[id].exports;
  var m = { exports: {} };
  __cache[id] = m;
  __mods[id](m, m.exports, function (r) { return __require(__resolve(id, r)); });
  return m.exports;
}
`;

const GLUE = `
var __doc = this;
var UI = __require('app/ui');
function __run(fn) {
  try { fn(__doc); }
  catch (e) { try { app.alert(String(e && e.message ? e.message : e)); } catch (_) {} }
}
__doc.onAdd = function () { __run(UI.onAdd); };
__doc.onRunSql = function () { __run(UI.onRunSql); };
__doc.onToggle = function () { __run(UI.onToggle); };
__doc.onDelete = function () { __run(UI.onDelete); };
var onAdd = __doc.onAdd, onRunSql = __doc.onRunSql, onToggle = __doc.onToggle, onDelete = __doc.onDelete;
__run(UI.init);
`;

function buildBundle() {
  let out = RUNTIME;
  for (const id in MODULE_FILES) {
    const code = fs.readFileSync(path.join(SRC, MODULE_FILES[id]), 'utf8');
    out += '__mods[' + JSON.stringify(id) + '] = function (module, exports, require) {\n' + code + '\n};\n';
  }
  return out + GLUE;
}

module.exports = { buildBundle };
