// YumYum-server/routes/recipes.routes.js

const express = require("express");
const router = express.Router();
const pool = require("../db");

/*
================================
Получить все рецепты
GET /api/recipes
================================
*/
router.get("/", async (req, res) => {
  try {
    const recipes = await pool.query("SELECT * FROM recipes ORDER BY id");

    res.json(recipes.rows);
  } catch (err) {
    console.error("Ошибка получения рецептов:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

/*
================================
Получить доступные рецепты
GET /api/recipes/available
================================
*/
router.get("/available", async (req, res) => {
  const userId = 1;

  try {
    const recipesResult = await pool.query(`
      SELECT id, name
      FROM recipes
      ORDER BY id
    `);

    const recipes = recipesResult.rows;
    const availableRecipes = [];

    for (const recipe of recipes) {
      const ingredientsResult = await pool.query(
        `
        SELECT
          ri.ingredient_id,
          ri.quantity,
          ri.unit,
          i.name,
          i.base_unit
        FROM recipe_ingredients ri
        JOIN ingredients i
          ON i.id = ri.ingredient_id
        WHERE ri.recipe_id = $1
        `,
        [recipe.id]
      );

      const ingredients = ingredientsResult.rows;
      let canCook = true;

      for (const ingredient of ingredients) {
        const availableResult = await pool.query(
          `
          SELECT COALESCE(
            SUM(
              CASE
                WHEN normalized_quantity > 0
                 AND normalized_unit = $3
                THEN normalized_quantity
                ELSE 0
              END
            ),
          0) AS available
          FROM products
          WHERE user_id = $1
          AND ingredient_id = $2
          `,
          [userId, ingredient.ingredient_id, ingredient.base_unit]
        );

        const availableQty = Number(availableResult.rows[0].available);
        const neededQty = Number(ingredient.quantity);

        if (availableQty < neededQty) {
          canCook = false;
          break;
        }
      }

      if (canCook) {
        availableRecipes.push({
          id: recipe.id,
          name: recipe.name,
        });
      }
    }

    res.json(availableRecipes);
  } catch (err) {
    console.error("Ошибка получения доступных рецептов:", err);
    res.status(500).json({
      error: "Ошибка сервера",
    });
  }
});

/*
================================
Рецепты с недостающими ингредиентами
GET /api/recipes/missing
================================
*/
router.get("/missing", async (req, res) => {
  const userId = 1;

  try {
    const recipesResult = await pool.query(`
      SELECT id, name
      FROM recipes
      ORDER BY id
    `);

    const recipes = recipesResult.rows;
    const recipesWithMissing = [];

    for (const recipe of recipes) {
      const ingredientsResult = await pool.query(
        `
        SELECT
          ri.ingredient_id,
          ri.quantity,
          ri.unit,
          i.name,
          i.base_unit
        FROM recipe_ingredients ri
        JOIN ingredients i
          ON i.id = ri.ingredient_id
        WHERE ri.recipe_id = $1
        `,
        [recipe.id]
      );

      const ingredients = ingredientsResult.rows;
      const missingIngredients = [];

      for (const ingredient of ingredients) {
        const availableResult = await pool.query(
          `
          SELECT COALESCE(
            SUM(
              CASE
                WHEN normalized_quantity > 0
                 AND normalized_unit = $3
                THEN normalized_quantity
                ELSE 0
              END
            ),
          0) AS available
          FROM products
          WHERE user_id = $1
          AND ingredient_id = $2
          `,
          [userId, ingredient.ingredient_id, ingredient.base_unit]
        );

        const availableQty = Number(availableResult.rows[0].available);
        const neededQty = Number(ingredient.quantity);

        if (availableQty < neededQty) {
          missingIngredients.push({
            name: ingredient.name,
            needed: neededQty,
            available: availableQty,
            unit: ingredient.base_unit,
          });
        }
      }

      if (missingIngredients.length > 0) {
        recipesWithMissing.push({
          id: recipe.id,
          name: recipe.name,
          missingIngredients,
        });
      }
    }

    res.json(recipesWithMissing);
  } catch (err) {
    console.error(
      "Ошибка получения рецептов с недостающими ингредиентами:",
      err
    );

    res.status(500).json({
      error: "Ошибка сервера",
    });
  }
});

/*
================================
Получить рецепт с ингредиентами
GET /api/recipes/:id
================================
*/
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const recipe = await pool.query("SELECT * FROM recipes WHERE id = $1", [id]);

    if (recipe.rows.length === 0) {
      return res.status(404).json({
        error: "Рецепт не найден",
      });
    }

    const ingredients = await pool.query(
      `
      SELECT
        ri.ingredient_id,
        i.name,
        ri.quantity,
        ri.unit
      FROM recipe_ingredients ri
      JOIN ingredients i
        ON i.id = ri.ingredient_id
      WHERE ri.recipe_id = $1
      `,
      [id]
    );

    res.json({
      ...recipe.rows[0],
      ingredients: ingredients.rows,
    });
  } catch (err) {
    console.error("Ошибка получения рецепта:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

/*
================================
Проверка возможности приготовления
GET /api/recipes/:id/check
================================
*/
router.get("/:id/check", async (req, res) => {
  const recipeId = req.params.id;
  const userId = 1;

  try {
    const ingredientsResult = await pool.query(
      `
      SELECT
        ri.ingredient_id,
        i.name,
        ri.quantity,
        ri.unit,
        i.base_unit
      FROM recipe_ingredients ri
      JOIN ingredients i
        ON i.id = ri.ingredient_id
      WHERE ri.recipe_id = $1
      `,
      [recipeId]
    );

    const ingredients = ingredientsResult.rows;
    const missingProducts = [];

    for (const ingredient of ingredients) {
      const availableResult = await pool.query(
        `
        SELECT COALESCE(
          SUM(
            CASE
              WHEN normalized_quantity > 0
               AND normalized_unit = $3
              THEN normalized_quantity
              ELSE 0
            END
          ),
        0) AS available
        FROM products
        WHERE user_id = $1
        AND ingredient_id = $2
        `,
        [userId, ingredient.ingredient_id, ingredient.base_unit]
      );

      const availableQty = Number(availableResult.rows[0].available);
      const neededQty = Number(ingredient.quantity);

      if (availableQty < neededQty) {
        missingProducts.push({
          name: ingredient.name,
          needed: neededQty,
          available: availableQty,
          unit: ingredient.base_unit,
        });
      }
    }

    res.json({
      canCook: missingProducts.length === 0,
      missingProducts,
    });
  } catch (err) {
    console.error("Ошибка проверки рецепта:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

/*
================================
Приготовить рецепт
POST /api/recipes/:id/cook
================================
*/
router.post("/:id/cook", async (req, res) => {
  const recipeId = req.params.id;
  const userId = 1;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /*
    ========================
    1. Получаем ингредиенты рецепта
    ========================
    */
    const ingredientsResult = await client.query(
      `
      SELECT
        ri.ingredient_id,
        ri.quantity,
        ri.unit,
        i.name,
        i.base_unit
      FROM recipe_ingredients ri
      JOIN ingredients i
        ON i.id = ri.ingredient_id
      WHERE ri.recipe_id = $1
      `,
      [recipeId]
    );

    const ingredients = ingredientsResult.rows;

    /*
    ========================
    2. Проверяем наличие по normalized_quantity
    ========================
    */
    for (const ingredient of ingredients) {
      const availableResult = await client.query(
        `
        SELECT COALESCE(
          SUM(
            CASE
              WHEN normalized_quantity > 0
               AND normalized_unit = $3
              THEN normalized_quantity
              ELSE 0
            END
          ),
        0) AS available
        FROM products
        WHERE user_id = $1
        AND ingredient_id = $2
        `,
        [userId, ingredient.ingredient_id, ingredient.base_unit]
      );

      const availableQty = Number(availableResult.rows[0].available);
      const neededQty = Number(ingredient.quantity);

      if (availableQty < neededQty) {
        throw new Error(`Недостаточно продукта: ${ingredient.name}`);
      }
    }

    /*
    ========================
    3. FIFO-списание по normalized_quantity
    ========================
    */
    for (const ingredient of ingredients) {
      let remaining = Number(ingredient.quantity);

      const productsResult = await client.query(
        `
        SELECT id, normalized_quantity
        FROM products
        WHERE user_id = $1
        AND ingredient_id = $2
        AND normalized_quantity > 0
        AND normalized_unit = $3
        ORDER BY created_at
        `,
        [userId, ingredient.ingredient_id, ingredient.base_unit]
      );

      const products = productsResult.rows;

      for (const product of products) {
        if (remaining <= 0) break;

        const available = Number(product.normalized_quantity);
        const toSubtract = Math.min(available, remaining);

        await client.query(
          `
          UPDATE products
          SET normalized_quantity = normalized_quantity - $1
          WHERE id = $2
          `,
          [toSubtract, product.id]
        );

        remaining -= toSubtract;
      }
    }

    await client.query("COMMIT");

    res.json({
      message: "Блюдо приготовлено ✅",
    });
  } catch (err) {
    await client.query("ROLLBACK");

    console.error("Ошибка приготовления:", err);

    res.status(400).json({
      error: err.message,
    });
  } finally {
    client.release();
  }
});

module.exports = router;