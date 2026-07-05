// hand-rolls indirect objects + xref + trailer
class PdfWriter {
  constructor() {
    this.objects = [];   // obj number i+1 lives at objects[i]
    this.rootRef = 1;
  }

  alloc() { this.objects.push(null); return this.objects.length; }

  set(num, body) { this.objects[num - 1] = body; }

  add(body) { const n = this.alloc(); this.set(n, body); return n; }

  addStream(dict, content) {
    const inner = dict.replace(/>>\s*$/, '/Length ' + content.length + ' >>');
    return this.add(inner + '\nstream\n' + content + '\nendstream');
  }

  pdfString(s) {
    return '(' + String(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)') + ')';
  }

  setRoot(num) { this.rootRef = num; }

  build() {
    let out = '%PDF-1.7\n%\xE2\xE3\xCF\xD3\n';
    const offsets = [];
    for (let i = 0; i < this.objects.length; i++) {
      offsets[i] = out.length;
      out += (i + 1) + ' 0 obj\n' + this.objects[i] + '\nendobj\n';
    }
    const xrefStart = out.length;
    const size = this.objects.length + 1;
    out += 'xref\n0 ' + size + '\n0000000000 65535 f \n';
    for (let i = 0; i < this.objects.length; i++) {
      out += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    }
    out += 'trailer\n<< /Size ' + size + ' /Root ' + this.rootRef + ' 0 R >>\n';
    out += 'startxref\n' + xrefStart + '\n%%EOF';
    return out;
  }
}

module.exports = { PdfWriter };
