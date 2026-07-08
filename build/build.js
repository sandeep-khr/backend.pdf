const fs = require('node:fs');
const path = require('node:path');
const { PdfWriter } = require('./pdf-writer');
const { buildBundle } = require('./bundle');

const L = 72;    // left margin
const R = 540;   // right margin
const W = 612;   // page width

function textField(w, name, rect, opts) {
  opts = opts || {};
  let ff = 0;
  if (opts.multiline) ff |= 4096;
  if (opts.readonly) ff |= 1;
  const v = opts.value ? w.pdfString(opts.value) : '()';
  const size = opts.size || 10;
  let s = '<< /Type /Annot /Subtype /Widget /FT /Tx /T ' + w.pdfString(name) +
    ' /Ff ' + ff + ' /Rect [' + rect.join(' ') + '] /V ' + v + ' /DA (/Cour ' + size + ' Tf 0.1 0.1 0.1 rg)' +
    ' /MK << /BC [0.55 0.55 0.55] /BG [0.99 0.99 0.98] >> /BS << /W 0.6 /S /S >>';
  if (opts.hidden) s += ' /F 2';
  return w.add(s + ' >>');
}

function button(w, name, rect, caption, js) {
  return w.add(
    '<< /Type /Annot /Subtype /Widget /FT /Btn /Ff 65536 /T ' + w.pdfString(name) +
    ' /Rect [' + rect.join(' ') + '] /MK << /CA ' + w.pdfString(caption) +
    ' /BG [0.92 0.91 0.89] /BC [0.45 0.45 0.45] >> /BS << /W 0.8 /S /S >>' +
    ' /A << /S /JavaScript /JS ' + w.pdfString(js) + ' >> >>'
  );
}

function build() {
  const w = new PdfWriter();
  const times = w.add('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>');
  const timesBold = w.add('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>');
  const timesItalic = w.add('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic >>');
  const courier = w.add('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');

  const fields = [];
  fields.push(textField(w, 'state', [0, 0, 1, 1], { hidden: true }));
  fields.push(textField(w, 'todo_list', [L, 486, R, 670], { multiline: true, readonly: true }));
  fields.push(textField(w, 'new_todo', [L, 446, 400, 470], {}));
  fields.push(button(w, 'add', [410, 446, 500, 470], 'Add', 'onAdd();'));
  fields.push(textField(w, 'action_id', [L, 408, 160, 432], {}));
  fields.push(button(w, 'toggle', [170, 408, 300, 432], 'Toggle done', 'onToggle();'));
  fields.push(button(w, 'delete', [310, 408, 410, 432], 'Delete', 'onDelete();'));
  fields.push(textField(w, 'sql_input', [L, 268, R, 348], { multiline: true, size: 11, value: 'select * from todos;' }));
  fields.push(button(w, 'run', [L, 236, 200, 262], 'Run SQL', 'onRunSql();'));
  fields.push(textField(w, 'sql_output', [L, 44, R, 206], { multiline: true, readonly: true }));

  const refs = fields.map(n => n + ' 0 R').join(' ');

  // fonts for drawn text: Ti = Times, TiBd = bold, TiIt = italic, Cour = mono
  const F = { times: 'Ti', bold: 'TiBd', italic: 'TiIt', mono: 'Cour' };
  const widthFactor = { Ti: 0.5, TiBd: 0.52, TiIt: 0.5, Cour: 0.6 };

  let content = '';
  function draw(font, size, x, y, str, gray) {
    const g = gray == null ? 0 : gray;
    content += g + ' ' + g + ' ' + g + ' rg\n';
    content += 'BT /' + font + ' ' + size + ' Tf ' + x + ' ' + y + ' Td ' + w.pdfString(str) + ' Tj ET\n';
  }
  function centered(font, size, y, str, gray) {
    const x = (W - str.length * size * widthFactor[font]) / 2;
    draw(font, size, x, y, str, gray);
  }
  function rule(y) {
    content += '0.6 0.6 0.6 RG 0.6 w ' + L + ' ' + y + ' m ' + R + ' ' + y + ' l S\n';
  }

  centered(F.bold, 24, 744, 'backend.pdf', 0.05);
  centered(F.italic, 12.5, 723, 'A relational database that lives inside this very document', 0.2);
  centered(F.mono, 9, 707, 'no server    no dependencies    one file', 0.4);
  rule(697);

  draw(F.bold, 13, L, 676, '1    Your todos', 0.05);
  draw(F.italic, 10.5, L, 474, 'Add a todo:', 0.3);
  draw(F.italic, 9.5, L, 438, 'Toggle or delete a todo by its id - type the number, then click.', 0.35);
  draw(F.italic, 9.5, L, 392, 'To save your data, use the Download icon in the toolbar (Cmd+S only re-downloads the original).', 0.35);

  draw(F.bold, 13, L, 372, '2    SQL console', 0.05);
  draw(F.italic, 9.5, L, 356, 'Edit the query and press Run SQL. Try:  select text from todos where done = 0', 0.35);

  draw(F.bold, 13, L, 216, '3    Results', 0.05);

  const contentStream = w.addStream('<< >>', content);

  // spike: only /OpenAction fires on load in chrome, not the js name tree
  const jsStream = w.addStream('<< >>', buildBundle());
  const openAction = w.add('<< /S /JavaScript /JS ' + jsStream + ' 0 R >>');

  const page = w.alloc();
  const pages = w.alloc();
  const catalog = w.alloc();

  const resources = '<< /Font << /Ti ' + times + ' 0 R /TiBd ' + timesBold + ' 0 R /TiIt ' +
    timesItalic + ' 0 R /Cour ' + courier + ' 0 R >> >>';
  w.set(page,
    '<< /Type /Page /Parent ' + pages + ' 0 R /MediaBox [0 0 612 792]' +
    ' /Resources ' + resources + ' /Contents ' + contentStream + ' 0 R /Annots [' + refs + '] >>');
  w.set(pages, '<< /Type /Pages /Kids [' + page + ' 0 R] /Count 1 >>');
  w.set(catalog,
    '<< /Type /Catalog /Pages ' + pages + ' 0 R' +
    ' /AcroForm << /Fields [' + refs + '] /NeedAppearances true /DA (/Cour 10 Tf 0 g)' +
    ' /DR ' + resources + ' >>' +
    ' /OpenAction ' + openAction + ' 0 R >>');
  w.setRoot(catalog);

  const out = path.join(__dirname, '..', 'backend.pdf');
  fs.writeFileSync(out, w.build(), 'latin1');
  console.log('wrote ' + out + ' (' + fs.statSync(out).size + ' bytes)');
}

build();
