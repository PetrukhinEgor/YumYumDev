// YumYum-server/db.js
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.resolve(
  __dirname,
  process.env.SQLITE_DB_PATH || "data/yumyum.db"
);

const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

db.pragma("foreign_keys = ON");

function query(sql, params = []) {
  const normalizedSql = String(sql || "").trim();
  const statement = db.prepare(normalizedSql);

  if (/^(SELECT|PRAGMA|WITH)\b/i.test(normalizedSql)) {
    return {
      rows: statement.all(params),
    };
  }

  const result = statement.run(params);

  return {
    rows: [],
    changes: result.changes,
    lastInsertRowid: result.lastInsertRowid,
  };
}

function get(sql, params = []) {
  return db.prepare(sql).get(params);
}

function all(sql, params = []) {
  return db.prepare(sql).all(params);
}

function run(sql, params = []) {
  return db.prepare(sql).run(params);
}

function transaction(callback) {
  return db.transaction(callback);
}

module.exports = {
  db,
  query,
  get,
  all,
  run,
  transaction,
};
