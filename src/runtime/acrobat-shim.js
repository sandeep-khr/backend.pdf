// fake doc/app so the ui can run under node --test
function createDoc(fieldNames) {
  const fields = {};
  (fieldNames || []).forEach(n => { fields[n] = { value: '' }; });
  return {
    getField(name) {
      if (!fields[name]) fields[name] = { value: '' };
      return fields[name];
    },
    _fields: fields,
  };
}

const app = {
  _alerts: [],
  alert(msg) { this._alerts.push(typeof msg === 'string' ? msg : (msg && msg.cMsg)); },
};

module.exports = { createDoc, app };
