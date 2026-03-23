// YumYum-server/initDb.js
const pool = require('./db')

// DROP TABLE IF EXISTS recipe_ingredients CASCADE;
// DROP TABLE IF EXISTS recipes CASCADE;
// DROP TABLE IF EXISTS products CASCADE;
// DROP TABLE IF EXISTS users CASCADE;

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
        name VARCHAR(255) UNIQUE NOT NULL,
        base_unit VARCHAR(20) NOT NULL
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
        quantity FLOAT DEFAULT 1,
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
        name VARCHAR(255) NOT NULL,
        description TEXT,
        cooking_time_min INTEGER,
        servings INTEGER,
        recipe_steps TEXT[]
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
        product_name VARCHAR(255),
        quantity NUMERIC,
        unit VARCHAR(50),
        ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE SET NULL
      );
    `);

    /*
    ========================================
    МЯГКАЯ МИГРАЦИЯ СУЩЕСТВУЮЩЕЙ БД
    Чтобы initDb не ломался на уже созданной базе
    ========================================
    */

    // products
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

    // recipes
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

    // recipe_ingredients
    await pool.query(`
      ALTER TABLE recipe_ingredients
      ADD COLUMN IF NOT EXISTS ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE SET NULL;
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
