require("dotenv").config();

const { Client } = require("pg");
const initDb = require("../initDb");
const { db, get, run, transaction } = require("../db");

const VALID_UNITS = new Set(["g", "ml", "pcs"]);

function normalizeUnit(unit, fallback = "g") {
  const normalized = String(unit || "").trim().toLowerCase();
  return VALID_UNITS.has(normalized) ? normalized : fallback;
}

function normalizeRecipeSteps(value) {
  if (Array.isArray(value)) {
    return value.map((step) => String(step || "").trim()).filter(Boolean);
  }

  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map((step) => String(step || "").trim()).filter(Boolean)
      : [];
  } catch {
    return String(value)
      .split("\n")
      .map((step) => step.trim())
      .filter(Boolean);
  }
}

function sqliteIngredientByName(name) {
  return get(
    `
    SELECT id, name, base_unit
    FROM ingredients
    WHERE LOWER(name) = LOWER(?)
    LIMIT 1
    `,
    [name]
  );
}

function ensureIngredient(name, baseUnit) {
  const trimmedName = String(name || "").trim();

  if (!trimmedName) return null;

  const existing = sqliteIngredientByName(trimmedName);

  if (existing) return existing;

  run(
    `
    INSERT INTO ingredients (name, base_unit)
    VALUES (?, ?)
    `,
    [trimmedName, normalizeUnit(baseUnit)]
  );

  return sqliteIngredientByName(trimmedName);
}

async function main() {
  await initDb();

  const pgClient = new Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: Number(process.env.PG_PORT || 5432),
  });

  await pgClient.connect();

  try {
    const ingredientsResult = await pgClient.query(`
      SELECT id, name, base_unit
      FROM ingredients
      ORDER BY id
    `);

    const recipesResult = await pgClient.query(`
      SELECT
        id,
        name,
        description,
        cooking_time_min,
        servings,
        recipe_steps,
        category
      FROM recipes
      ORDER BY id
    `);

    const recipeIngredientsResult = await pgClient.query(`
      SELECT
        ri.id,
        ri.recipe_id,
        ri.product_name,
        ri.quantity,
        ri.unit,
        ri.ingredient_id,
        i.name AS ingredient_name,
        i.base_unit AS ingredient_base_unit
      FROM recipe_ingredients ri
      JOIN ingredients i
        ON i.id = ri.ingredient_id
      ORDER BY ri.id
    `);

    const migrate = transaction(() => {
      run("DELETE FROM recipe_ingredients");
      run("DELETE FROM recipes");
      run("DELETE FROM products");
      run("DELETE FROM sqlite_sequence WHERE name IN (?, ?, ?)", [
        "recipe_ingredients",
        "recipes",
        "products",
      ]);

      for (const ingredient of ingredientsResult.rows) {
        ensureIngredient(ingredient.name, ingredient.base_unit);
      }

      for (const recipe of recipesResult.rows) {
        run(
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
            recipe.description || null,
            recipe.cooking_time_min ?? null,
            recipe.servings ?? null,
            JSON.stringify(normalizeRecipeSteps(recipe.recipe_steps)),
            recipe.category || "Другое",
          ]
        );
      }

      for (const item of recipeIngredientsResult.rows) {
        const ingredient = ensureIngredient(
          item.ingredient_name || item.product_name,
          item.ingredient_base_unit || item.unit
        );

        if (!ingredient) continue;

        run(
          `
          INSERT INTO recipe_ingredients (
            id,
            recipe_id,
            product_name,
            quantity,
            unit,
            ingredient_id
          )
          VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            item.id,
            item.recipe_id,
            item.product_name || ingredient.name,
            Number(item.quantity),
            normalizeUnit(item.unit, ingredient.base_unit),
            ingredient.id,
          ]
        );
      }
    });

    migrate();

    const summary = {
      pgIngredients: ingredientsResult.rows.length,
      pgRecipes: recipesResult.rows.length,
      pgRecipeIngredients: recipeIngredientsResult.rows.length,
      sqliteIngredients: get("SELECT COUNT(*) AS count FROM ingredients").count,
      sqliteProducts: get("SELECT COUNT(*) AS count FROM products").count,
      sqliteRecipes: get("SELECT COUNT(*) AS count FROM recipes").count,
      sqliteRecipeIngredients: get("SELECT COUNT(*) AS count FROM recipe_ingredients").count,
    };

    console.log(JSON.stringify(summary, null, 2));
    console.log("PostgreSQL data migrated to SQLite");
  } finally {
    await pgClient.end();
    db.close();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
