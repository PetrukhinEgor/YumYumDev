//YumYum-server/routes/recipes.routes.js

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
  const userId = 1; // пока используем тестового пользователя

  try {
    /*
    =========================
    1. Получаем все рецепты
    =========================
    */
    const recipesResult = await pool.query(`
      SELECT id, name
      FROM recipes
      ORDER BY id
    `);

    const recipes = recipesResult.rows;

    const availableRecipes = [];

    /*
    =========================
    2. Проверяем каждый рецепт
    =========================
    */
    for (const recipe of recipes) {
      /*
      Получаем ингредиенты рецепта
      */
      const ingredientsResult = await pool.query(
        `
        SELECT ri.ingredient_id, ri.quantity
        FROM recipe_ingredients ri
        WHERE ri.recipe_id = $1
        `,
        [recipe.id],
      );

      const ingredients = ingredientsResult.rows;

      let canCook = true;

      /*
      Проверяем каждый ингредиент
      */
      for (const ingredient of ingredients) {
        const productResult = await pool.query(
          `
          SELECT COALESCE(SUM(CASE WHEN quantity > 0 THEN quantity ELSE 0 END),
0) AS quantity
          FROM products
          WHERE user_id = $1
          AND ingredient_id = $2
          `,
          [userId, ingredient.ingredient_id],
        );

        const availableQty = Number(productResult.rows[0].quantity);

        if (availableQty < ingredient.quantity) {
          canCook = false;
          break;
        }
      }

      /*
      Если все ингредиенты есть — добавляем рецепт
      */
      if (canCook) {
        availableRecipes.push(recipe);
      }
    }

    /*
    =========================
    3. Возвращаем результат
    =========================
    */
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
    /*
    =========================
    1. Получаем все рецепты
    =========================
    */
    const recipesResult = await pool.query(`
      SELECT id, name
      FROM recipes
      ORDER BY id
    `);

    const recipes = recipesResult.rows;

    const recipesWithMissing = [];

    /*
    =========================
    2. Проверяем каждый рецепт
    =========================
    */
    for (const recipe of recipes) {
      /*
      Получаем ингредиенты рецепта
      */
      const ingredientsResult = await pool.query(
        `
        SELECT ri.ingredient_id,
               ri.quantity,
               i.name
        FROM recipe_ingredients ri
        JOIN ingredients i
          ON i.id = ri.ingredient_id
        WHERE ri.recipe_id = $1
        `,
        [recipe.id],
      );

      const ingredients = ingredientsResult.rows;

      const missingIngredients = [];

      /*
      =========================
      Проверяем ингредиенты
      =========================
      */
      for (const ingredient of ingredients) {
        const productResult = await pool.query(
          `
          SELECT COALESCE(SUM(CASE WHEN quantity > 0 THEN quantity ELSE 0 END),
0) AS quantity
          FROM products
          WHERE user_id = $1
          AND ingredient_id = $2
          `,
          [userId, ingredient.ingredient_id],
        );

        const availableQty = Number(productResult.rows[0].quantity);

        if (availableQty < ingredient.quantity) {
          missingIngredients.push({
            name: ingredient.name,
            needed: ingredient.quantity,
            available: availableQty,
          });
        }
      }

      /*
      =========================
      Если не хватает ингредиентов
      =========================
      */
      if (missingIngredients.length > 0) {
        recipesWithMissing.push({
          id: recipe.id,
          name: recipe.name,
          missingIngredients,
        });
      }
    }

    /*
    =========================
    Ответ
    =========================
    */
    res.json(recipesWithMissing);
  } catch (err) {
    console.error(
      "Ошибка получения рецептов с недостающими ингредиентами:",
      err,
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
    const recipe = await pool.query("SELECT * FROM recipes WHERE id = $1", [
      id,
    ]);

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
      [id],
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

  // пока используем тестового пользователя
  const userId = 1;

  try {
    /*
    ================================
    1. Получаем ингредиенты рецепта
    ================================
    */
    const ingredientsResult = await pool.query(
      `
  SELECT
    ri.ingredient_id,
    i.name,
    ri.quantity
  FROM recipe_ingredients ri
  JOIN ingredients i
    ON i.id = ri.ingredient_id
  WHERE ri.recipe_id = $1
  `,
      [recipeId],
    );

    const ingredients = ingredientsResult.rows;

    /*
    ================================
    2. Проверяем продукты пользователя
    ================================
    */
    const missingProducts = [];

    for (const ingredient of ingredients) {
      const productResult = await pool.query(
        `
    SELECT COALESCE(SUM(CASE WHEN quantity > 0 THEN quantity ELSE 0 END),
0) AS quantity
    FROM products
    WHERE user_id = $1
    AND ingredient_id = $2
    `,
        [userId, ingredient.ingredient_id],
      );

      const availableQty = Number(productResult.rows[0].quantity);

      if (availableQty < ingredient.quantity) {
        missingProducts.push({
          name: ingredient.name,
          needed: ingredient.quantity,
          available: availableQty,
        });
      }
    }

    /*
    ================================
    3. Ответ
    ================================
    */
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
    1. Получаем ингредиенты
    ========================
    */
    const ingredientsResult = await client.query(
      `
      SELECT ri.ingredient_id,
             ri.quantity,
             i.name
      FROM recipe_ingredients ri
      JOIN ingredients i
        ON i.id = ri.ingredient_id
      WHERE ri.recipe_id = $1
      `,
      [recipeId],
    );

    const ingredients = ingredientsResult.rows;

    /*
    ========================
    2. Проверяем наличие
    ========================
    */
    for (const ingredient of ingredients) {
      const result = await client.query(
        `
        SELECT COALESCE(SUM(CASE WHEN quantity > 0 THEN quantity ELSE 0 END),
0) AS quantity
        FROM products
        WHERE user_id = $1
        AND ingredient_id = $2
        `,
        [userId, ingredient.ingredient_id],
      );

      const available = Number(result.rows[0].quantity);

      if (available < ingredient.quantity) {
        throw new Error(`Недостаточно продукта: ${ingredient.name}`);
      }
    }

    /*
    ========================
    3. Списание продуктов
    ========================
    */
    for (const ingredient of ingredients) {
      let remaining = Number(ingredient.quantity);

      /*
  Получаем все продукты этого ингредиента
  */
      const productsResult = await client.query(
        `
    SELECT id, quantity
    FROM products
    WHERE user_id = $1
    AND ingredient_id = $2
    AND quantity > 0
    ORDER BY created_at
    `,
        [userId, ingredient.ingredient_id],
      );

      const products = productsResult.rows;

      for (const product of products) {
        if (remaining <= 0) break;

        const available = Number(product.quantity);

        const toSubtract = Math.min(available, remaining);

        await client.query(
          `
      UPDATE products
      SET quantity = quantity - $1
      WHERE id = $2
      `,
          [toSubtract, product.id],
        );

        remaining -= toSubtract;
      }
    }

    /*
    ========================
    SUCCESS
    ========================
    */
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
