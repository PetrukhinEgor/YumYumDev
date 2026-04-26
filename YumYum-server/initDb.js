const pool = require("./db");

async function initDb() {
  try {
    /*
    ========================================
    USERS
    ========================================
    */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    /*
    ========================================
    INGREDIENTS
    ========================================
    */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        base_unit VARCHAR(20)
      );
    `);

    /*
    ========================================
    PRODUCTS
    ========================================
    */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        quantity DOUBLE PRECISION DEFAULT 1,
        unit VARCHAR(50),
        expires_at DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE SET NULL,
        normalized_quantity NUMERIC,
        normalized_unit VARCHAR(20)
      );
    `);

    /*
    ========================================
    RECIPES
    ========================================
    */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recipes (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        cooking_time_min INTEGER,
        servings INTEGER,
        recipe_steps TEXT[],
        category TEXT DEFAULT 'Другое'
      );
    `);

    /*
    ========================================
    RECIPE_INGREDIENTS
    ========================================
    */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recipe_ingredients (
        id SERIAL PRIMARY KEY,
        recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
        product_name TEXT NOT NULL,
        quantity NUMERIC NOT NULL,
        unit TEXT NOT NULL,
        ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT
      );
    `);

    /*
    ========================================
    МЯГКИЕ МИГРАЦИИ
    ========================================
    */

    await pool.query(`
      ALTER TABLE ingredients
      ADD COLUMN IF NOT EXISTS base_unit VARCHAR(20);
    `);

    await pool.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE SET NULL;
    `);

    await pool.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS normalized_quantity NUMERIC;
    `);

    await pool.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS normalized_unit VARCHAR(20);
    `);

    await pool.query(`
      ALTER TABLE recipes
      ADD COLUMN IF NOT EXISTS description TEXT;
    `);

    await pool.query(`
      ALTER TABLE recipes
      ADD COLUMN IF NOT EXISTS cooking_time_min INTEGER;
    `);

    await pool.query(`
      ALTER TABLE recipes
      ADD COLUMN IF NOT EXISTS servings INTEGER;
    `);

    await pool.query(`
      ALTER TABLE recipes
      ADD COLUMN IF NOT EXISTS recipe_steps TEXT[];
    `);

    await pool.query(`
      ALTER TABLE recipes
      ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Другое';
    `);

    await pool.query(`
      ALTER TABLE recipe_ingredients
      ADD COLUMN IF NOT EXISTS ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE RESTRICT;
    `);

    /*
    ========================================
    ИНДЕКСЫ И ОГРАНИЧЕНИЯ
    ========================================
    */

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS products_user_id_name_unique
      ON products (user_id, name);
    `);

    console.log("База данных и таблицы готовы");
  } catch (err) {
    console.error("Ошибка инициализации БД:", err);
  }

  try {
    /*
    ========================================
    ТЕСТОВЫЙ ПОЛЬЗОВАТЕЛЬ
    ========================================
    */
    const userCheck = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      ["test@test.com"]
    );

    if (userCheck.rows.length === 0) {
      await pool.query(
        "INSERT INTO users (email, password_hash) VALUES ($1, $2)",
        ["test@test.com", "123456"]
      );
      console.log("Тестовый пользователь создан");
    }
  } catch (err) {
    console.error("Ошибка создания тестового пользователя:", err);
  }
}

module.exports = initDb;
