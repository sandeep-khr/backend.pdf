const { parse } = require('../sql/parser');
const { execute } = require('../sql/executor');

class Database {
  constructor() { this.tables = {}; }

  run(sql) { return execute(parse(sql), this); }

  serialize() { return JSON.stringify({ v: 1, tables: this.tables }); }

  static deserialize(str) {
    const db = new Database();
    if (!str) return db;
    try {
      const data = JSON.parse(str);
      if (data && data.tables) db.tables = data.tables;
    } catch (e) {
      // corrupt blob -> start clean
    }
    return db;
  }
}

module.exports = { Database };
