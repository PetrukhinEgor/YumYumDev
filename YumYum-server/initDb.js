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

    CREATE TABLE IF NOT EXISTS shelf_life_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ingredient_id INTEGER UNIQUE NOT NULL,
      default_days INTEGER NOT NULL CHECK (default_days > 0),
      storage_type TEXT DEFAULT 'fridge',
      note TEXT,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
    );

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

  const shelfLifeRules = [
    ["Молоко", 5, "fridge", "После открытия лучше использовать быстрее"],
    ["Кефир", 7, "fridge", null],
    ["Сметана", 7, "fridge", null],
    ["Творог", 5, "fridge", null],
    ["Йогурт", 7, "fridge", null],
    ["Сыр", 14, "fridge", null],
    ["Масло", 30, "fridge", null],
    ["Майонез", 30, "fridge", "После открытия срок может быть меньше"],
    ["Яйца", 25, "fridge", null],
    ["Курица", 2, "fridge", "Охлажденное мясо лучше использовать в первую очередь"],
    ["Фарш", 1, "fridge", "Фарш портится быстрее цельного мяса"],
    ["Свинина", 3, "fridge", null],
    ["Говядина", 3, "fridge", null],
    ["Рыба", 2, "fridge", null],
    ["Картофель", 30, "pantry", null],
    ["Морковь", 21, "fridge", null],
    ["Лук", 30, "pantry", null],
    ["Чеснок", 60, "pantry", null],
    ["Огурец", 7, "fridge", null],
    ["Помидор", 7, "room", null],
    ["Капуста", 21, "fridge", null],
    ["Свекла", 30, "fridge", null],
    ["Гречка", 365, "pantry", null],
    ["Рис", 365, "pantry", null],
    ["Макароны", 365, "pantry", null],
    ["Фасоль", 365, "pantry", null],
    ["Хлеб", 4, "room", null],
    ["Лаваш", 5, "room", null],
    ["Багет", 2, "room", null],
    ["Чипсы", 120, "pantry", null],
    ["Паштет", 7, "fridge", "Если упаковка открыта, срок меньше"],
    ["Мандарин", 10, "room", null],
    ["Груша", 7, "room", null],
    ["Банан", 5, "room", null],
    ["Вода", 365, "pantry", null],
    ["Профитроли", 3, "fridge", null],
    ["Мороженое", 90, "freezer", null],
    ["Приправа", 365, "pantry", null],
    ["Печенье", 120, "pantry", null],
    ["Кекс", 10, "room", null],
    ["Леденцы", 365, "pantry", null],
    ["Сок", 30, "pantry", "После открытия хранить в холодильнике"],
    ["Нектар", 30, "pantry", "После открытия хранить в холодильнике"],
    ["Пельмени", 90, "freezer", null],
  ];

  for (const [ingredientName, defaultDays, storageType, note] of shelfLifeRules) {
    run(
      `
      INSERT OR IGNORE INTO shelf_life_rules (
        ingredient_id,
        default_days,
        storage_type,
        note
      )
      SELECT id, ?, ?, ?
      FROM ingredients
      WHERE name = ?
      `,
      [defaultDays, storageType, note, ingredientName]
    );
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
