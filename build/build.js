const fs = require('node:fs');
const path = require('node:path');
const { PdfWriter } = require('./pdf-writer');
const { buildBundle } = require('./bundle');

function textField(w, name, rect, opts) {
  opts = opts || {};
  let ff = 0;
  if (opts.multiline) ff |= 4096;
  if (opts.readonly) ff |= 1;
  let s = '<< /Type /Annot /Subtype /Widget /FT /Tx /T ' + w.pdfString(name) +
    ' /Ff ' + ff + ' /Rect [' + rect.join(' ') + '] /V () /DA (/Helv 10 Tf 0 g)' +
    ' /MK << /BC [0.6 0.6 0.6] /BG [1 1 1] >> /BS << /W 1 /S /S >>';
  if (opts.hidden) s += ' /F 2';
  return w.add(s + ' >>');
}

function button(w, name, rect, caption, js) {
  return w.add(
    '<< /Type /Annot /Subtype /Widget /FT /Btn /Ff 65536 /T ' + w.pdfString(name) +
    ' /Rect [' + rect.join(' ') + '] /MK << /CA ' + w.pdfString(caption) +
    ' /BG [0.86 0.86 0.86] /BC [0.4 0.4 0.4] >> /BS << /W 1 /S /S >>' +
    ' /A << /S /JavaScript /JS ' + w.pdfString(js) + ' >> >>'
  );
}

function build() {
  const w = new PdfWriter();
  const font = w.add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  // letter page, origin bottom-left
  const fields = [];
  fields.push(textField(w, 'state', [0, 0, 1, 1], { hidden: true }));
  fields.push(textField(w, 'todo_list', [40, 470, 572, 720], { multiline: true, readonly: true }));
  fields.push(textField(w, 'new_todo', [40, 430, 360, 458], {}));
  fields.push(button(w, 'add', [370, 430, 470, 458], 'Add', 'onAdd();'));
  fields.push(textField(w, 'action_id', [40, 390, 140, 418], {}));
  fields.push(button(w, 'toggle', [150, 390, 270, 418], 'Toggle done', 'onToggle();'));
  fields.push(button(w, 'delete', [280, 390, 380, 418], 'Delete', 'onDelete();'));
  fields.push(textField(w, 'sql_input', [40, 250, 572, 330], { multiline: true }));
  fields.push(button(w, 'run', [40, 218, 160, 246], 'Run SQL', 'onRunSql();'));
  fields.push(textField(w, 'sql_output', [40, 40, 572, 210], { multiline: true, readonly: true }));

  const refs = fields.map(n => n + ' 0 R').join(' ');

  // spike: only /OpenAction fires on load in chrome, not the js name tree
  const jsStream = w.addStream('<< >>', buildBundle());
  const openAction = w.add('<< /S /JavaScript /JS ' + jsStream + ' 0 R >>');

  const page = w.alloc();
  const pages = w.alloc();
  const catalog = w.alloc();

  w.set(page,
    '<< /Type /Page /Parent ' + pages + ' 0 R /MediaBox [0 0 612 792]' +
    ' /Resources << /Font << /Helv ' + font + ' 0 R >> >> /Annots [' + refs + '] >>');
  w.set(pages, '<< /Type /Pages /Kids [' + page + ' 0 R] /Count 1 >>');
  w.set(catalog,
    '<< /Type /Catalog /Pages ' + pages + ' 0 R' +
    ' /AcroForm << /Fields [' + refs + '] /NeedAppearances true /DA (/Helv 10 Tf 0 g)' +
    ' /DR << /Font << /Helv ' + font + ' 0 R >> >> >>' +
    ' /OpenAction ' + openAction + ' 0 R >>');
  w.setRoot(catalog);

  const out = path.join(__dirname, '..', 'backend.pdf');
  fs.writeFileSync(out, w.build(), 'latin1');
  console.log('wrote ' + out + ' (' + fs.statSync(out).size + ' bytes)');
}

build();
