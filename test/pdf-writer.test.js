const { test } = require('node:test');
const assert = require('node:assert');
const { PdfWriter } = require('../build/pdf-writer');

test('builds a structurally valid PDF', () => {
  const w = new PdfWriter();
  const root = w.add('<< /Type /Catalog >>');
  w.setRoot(root);
  const pdf = w.build();
  assert.ok(pdf.startsWith('%PDF-1.7'));
  assert.ok(pdf.includes('xref'));
  assert.ok(pdf.includes('/Root ' + root + ' 0 R'));
  assert.ok(pdf.trim().endsWith('%%EOF'));
});

test('xref offsets point at the right objects', () => {
  const w = new PdfWriter();
  const a = w.add('<< /A true >>');
  w.setRoot(a);
  const pdf = w.build();
  const xrefIdx = pdf.indexOf('\nxref\n');
  const lines = pdf.slice(xrefIdx + 6).split('\n');
  const offset = parseInt(lines[2].slice(0, 10), 10);
  assert.strictEqual(pdf.slice(offset, offset + 7), '1 0 obj');
});

test('addStream sets a correct Length', () => {
  const w = new PdfWriter();
  const body = 'hello world';
  const s = w.addStream('<< /S /JavaScript >>', body);
  w.setRoot(w.add('<< /Type /Catalog /X ' + s + ' 0 R >>'));
  const pdf = w.build();
  assert.ok(pdf.includes('/Length ' + body.length));
  assert.ok(pdf.includes('stream\n' + body + '\nendstream'));
});

test('pdfString escapes parens and backslashes', () => {
  const w = new PdfWriter();
  assert.strictEqual(w.pdfString('a(b)c\\d'), '(a\\(b\\)c\\\\d)');
});
