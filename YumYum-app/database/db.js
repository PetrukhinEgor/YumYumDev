import * as SQLite from "expo-sqlite";
import {
  INGREDIENTS,
  KEYWORD_RULES,
  RECIPES,
  SHELF_LIFE_RULES,
} from "./seedData";

let databasePromise = null;
let initPromise = null;

export async function getDb() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync("yumyum-local.db");
  }

  return databasePromise;
}

export async function run(sql, params = []) {
  const db = await getDb();
  return db.runAsync(sql, ...params);
}

export async function getFirst(sql, params = []) {
  const db = await getDb();
  return db.getFirstAsync(sql, ...params);
}

export async function getAll(sql, params = []) {
  const db = await getDb();
  return db.getAllAsync(sql, ...params);
}

export async function initializeDatabase() {
  if (!initPromise) {
    initPromise = initializeDatabaseInternal();
  }

  return initPromise;
}

async function initializeDatabaseInternal() {
  const db = await getDb();

  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      base_unit TEXT NOT NULL CHECK (base_unit IN ('g', 'ml', 'pcs'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER DEFAULT 1,
      name TEXT NOT NULL,
      quantity REAL DEFAULT 1,
      unit TEXT CHECK (unit IS NULL OR unit IN ('g', 'ml', 'pcs')),
      expires_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      ingredient_id INTEGER,
      normalized_quantity REAL,
      normalized_unit TEXT CHECK (normalized_unit IS NULL OR normalized_unit IN ('g', 'ml', 'pcs')),
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

    CREATE TABLE IF NOT EXISTS product_match_keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT UNIQUE NOT NULL,
      ingredient_id INTEGER,
      is_food INTEGER NOT NULL DEFAULT 1 CHECK (is_food IN (0, 1)),
      priority INTEGER NOT NULL DEFAULT 100,
      source TEXT NOT NULL DEFAULT 'system',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_product_match_keywords_priority
      ON product_match_keywords (priority, keyword);

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

  await seedInitialData();
}

async function seedInitialData() {
  for (const [name, baseUnit] of INGREDIENTS) {
    await run(
      "INSERT OR IGNORE INTO ingredients (name, base_unit) VALUES (?, ?)",
      [name, baseUnit]
    );
  }

  for (const [ingredientName, defaultDays, storageType] of SHELF_LIFE_RULES) {
    await run(
      `
      INSERT OR IGNORE INTO shelf_life_rules (
        ingredient_id,
        default_days,
        storage_type
      )
      SELECT id, ?, ?
      FROM ingredients
      WHERE name = ?
      `,
      [defaultDays, storageType, ingredientName]
    );
  }

  for (const [keyword, ingredientName, isFood, priority] of KEYWORD_RULES) {
    if (ingredientName) {
      await run(
        `
        INSERT OR IGNORE INTO product_match_keywords (
          keyword,
          ingredient_id,
          is_food,
          priority,
          source
        )
        SELECT ?, id, ?, ?, 'system'
        FROM ingredients
        WHERE name = ?
        `,
        [keyword, isFood, priority, ingredientName]
      );
    } else {
      await run(
        `
        INSERT OR IGNORE INTO product_match_keywords (
          keyword,
          ingredient_id,
          is_food,
          priority,
          source
        )
        VALUES (?, NULL, ?, ?, 'system')
        `,
        [keyword, isFood, priority]
      );
    }
  }

  const recipeCount = await getFirst("SELECT COUNT(*) AS count FROM recipes");

  if (Number(recipeCount?.count || 0) > 0) return;

  for (const recipe of RECIPES) {
    await run(
      `
      INSERT INTO recipes (
        id,
        name,
        description,
        cooking_time_min,
        servings,
        recipe_steps,
        category
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        recipe.id,
        recipe.name,
        recipe.description,
        recipe.cooking_time_min,
        recipe.servings,
        JSON.stringify(recipe.recipe_steps),
        recipe.category,
      ]
    );

    for (const [ingredientName, quantity, unit] of recipe.ingredients) {
      await run(
        `
        INSERT INTO recipe_ingredients (
          recipe_id,
          ingredient_id,
          product_name,
          quantity,
          unit
        )
        SELECT ?, id, name, ?, ?
        FROM ingredients
        WHERE name = ?
        `,
        [recipe.id, quantity, unit, ingredientName]
      );
    }
  }
}
