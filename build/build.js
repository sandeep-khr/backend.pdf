const fs = require('node:fs');
const path = require('node:path');
const { PdfWriter } = require('./pdf-writer');
const { buildBundle } = require('./bundle');

function textField(w, name, rect, opts) {
  opts = opts || {};
  let ff = 0;
  if (opts.multiline) ff |= 4096;
  if (opts.readonly) ff |= 1;
  const v = opts.value ? w.pdfString(opts.value) : '()';
  let s = '<< /Type /Annot /Subtype /Widget /FT /Tx /T ' + w.pdfString(name) +
    ' /Ff ' + ff + ' /Rect [' + rect.join(' ') + '] /V ' + v + ' /DA (/Helv 11 Tf 0 g)' +
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
  const bold = w.add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

  const fields = [];
  fields.push(textField(w, 'state', [0, 0, 1, 1], { hidden: true }));
  fields.push(textField(w, 'todo_list', [40, 500, 572, 712], { multiline: true, readonly: true }));
  fields.push(textField(w, 'new_todo', [40, 456, 380, 484], {}));
  fields.push(button(w, 'add', [390, 456, 480, 484], 'Add', 'onAdd();'));
  fields.push(textField(w, 'action_id', [40, 410, 130, 438], {}));
  fields.push(button(w, 'toggle', [140, 410, 280, 438], 'Toggle done', 'onToggle();'));
  fields.push(button(w, 'delete', [290, 410, 390, 438], 'Delete', 'onDelete();'));
  fields.push(textField(w, 'sql_input', [40, 276, 572, 342], { multiline: true, value: 'select * from todos;' }));
  fields.push(button(w, 'run', [40, 244, 170, 272], 'Run SQL', 'onRunSql();'));
  fields.push(textField(w, 'sql_output', [40, 40, 572, 224], { multiline: true, readonly: true }));

  const refs = fields.map(n => n + ' 0 R').join(' ');

  const labels = [
    { size: 20, y: 760, text: 'backend.pdf', bold: true },
    { size: 11, y: 740, gray: 0.35, text: 'a real SQL database that lives inside this PDF file' },
    { size: 12, y: 720, bold: true, text: 'Your todos' },
    { size: 10, y: 490, gray: 0.35, text: 'Add a todo:' },
    { size: 9, y: 446, gray: 0.4, text: 'Toggle or delete by id - type the number, then click the button' },
    { size: 9, y: 384, gray: 0.4, text: 'To save your data: click the Download icon in the toolbar (Cmd+S just re-downloads the original)' },
    { size: 12, y: 370, bold: true, text: 'SQL console' },
    { size: 9, y: 356, gray: 0.35, text: 'Edit the query and hit Run SQL. Try: select text from todos where done = 0' },
    { size: 12, y: 234, bold: true, text: 'Results' },
  ];

  let content = '';
  for (const l of labels) {
    const g = l.gray == null ? 0 : l.gray;
    const fontName = l.bold ? 'HelvB' : 'Helv';
    content += g + ' ' + g + ' ' + g + ' rg\n';
    content += 'BT /' + fontName + ' ' + l.size + ' Tf ' + 40 + ' ' + l.y + ' Td ' + w.pdfString(l.text) + ' Tj ET\n';
  }
  const contentStream = w.addStream('<< >>', content);

  // spike: only /OpenAction fires on load in chrome, not the js name tree
  const jsStream = w.addStream('<< >>', buildBundle());
  const openAction = w.add('<< /S /JavaScript /JS ' + jsStream + ' 0 R >>');

  const page = w.alloc();
  const pages = w.alloc();
  const catalog = w.alloc();

  const resources = '<< /Font << /Helv ' + font + ' 0 R /HelvB ' + bold + ' 0 R >> >>';
  w.set(page,
    '<< /Type /Page /Parent ' + pages + ' 0 R /MediaBox [0 0 612 792]' +
    ' /Resources ' + resources + ' /Contents ' + contentStream + ' 0 R /Annots [' + refs + '] >>');
  w.set(pages, '<< /Type /Pages /Kids [' + page + ' 0 R] /Count 1 >>');
  w.set(catalog,
    '<< /Type /Catalog /Pages ' + pages + ' 0 R' +
    ' /AcroForm << /Fields [' + refs + '] /NeedAppearances true /DA (/Helv 11 Tf 0 g)' +
    ' /DR ' + resources + ' >>' +
    ' /OpenAction ' + openAction + ' 0 R >>');
  w.setRoot(catalog);

  const out = path.join(__dirname, '..', 'backend.pdf');
  fs.writeFileSync(out, w.build(), 'latin1');
  console.log('wrote ' + out + ' (' + fs.statSync(out).size + ' bytes)');
}

build();
