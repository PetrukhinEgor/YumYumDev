const fs = require("fs");
const path = require("path");
const { db, get, run } = require("./db");

async function initDb() {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      base_unit TEXT NOT NULL CHECK (base_unit IN ('g', 'ml', 'pcs'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      quantity REAL DEFAULT 1,
      unit TEXT CHECK (unit IS NULL OR unit IN ('g', 'ml', 'pcs')),
      expires_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      ingredient_id INTEGER,
      normalized_quantity REAL,
      normalized_unit TEXT CHECK (normalized_unit IS NULL OR normalized_unit IN ('g', 'ml', 'pcs')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE SET NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS products_user_id_name_unique
      ON products (user_id, name);

    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      cooking_time_min INTEGER,
      servings INTEGER,
      recipe_steps TEXT,
      category TEXT DEFAULT 'Другое'
    );

    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL CHECK (unit IN ('g', 'ml', 'pcs')),
      ingredient_id INTEGER NOT NULL,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE RESTRICT
    );
  `);

  const seedPath = path.join(__dirname, "data", "seed_ingredients.sql");

  if (fs.existsSync(seedPath)) {
    db.exec(fs.readFileSync(seedPath, "utf8"));
  }

  const user = get("SELECT id FROM users WHERE email = ?", ["test@test.com"]);

  if (!user) {
    run("INSERT INTO users (email, password_hash) VALUES (?, ?)", [
      "test@test.com",
      "123456",
    ]);
  }

  console.log("SQLite database is ready");
}

module.exports = initDb;
