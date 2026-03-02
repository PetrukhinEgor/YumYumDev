const pool = require('./db')

// DROP TABLE IF EXISTS recipe_ingredients CASCADE;
// DROP TABLE IF EXISTS recipes CASCADE;
// DROP TABLE IF EXISTS products CASCADE;
// DROP TABLE IF EXISTS users CASCADE;


async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        quantity FLOAT DEFAULT 1,
        unit VARCHAR(50),
        expires_at DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS recipes (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT
      );
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS recipe_ingredients (
        id SERIAL PRIMARY KEY,
        recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
        product_name VARCHAR(255),
        quantity FLOAT,
        unit VARCHAR(50)
      );
    `)

    console.log("База данных и таблицы готовы")
  } catch (err) {
    console.error("Ошибка инициализации БД:", err)
  }
  // Создаем тестового пользователя если его нет
const userCheck = await pool.query(
  "SELECT * FROM users WHERE email = $1",
  ["test@test.com"]
)

if (userCheck.rows.length === 0) {
  await pool.query(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2)",
    ["test@test.com", "123456"]
  )
  console.log("Тестовый пользователь создан")
}

}

module.exports = initDb
