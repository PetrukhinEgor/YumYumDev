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

module.exports = router;

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
    SELECT COALESCE(SUM(quantity),0) AS quantity
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
      [recipeId]
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
        SELECT COALESCE(SUM(quantity),0) AS quantity
        FROM products
        WHERE user_id = $1
        AND ingredient_id = $2
        `,
        [userId, ingredient.ingredient_id]
      );

      const available = Number(result.rows[0].quantity);

      if (available < ingredient.quantity) {
        throw new Error(
          `Недостаточно продукта: ${ingredient.name}`
        );
      }
    }

    /*
    ========================
    3. Списание продуктов
    ========================
    */
    for (const ingredient of ingredients) {

      await client.query(
        `
        UPDATE products
        SET quantity = quantity - $1
        WHERE user_id = $2
        AND ingredient_id = $3
        `,
        [
          ingredient.quantity,
          userId,
          ingredient.ingredient_id
        ]
      );
    }

    /*
    ========================
    SUCCESS
    ========================
    */
    await client.query("COMMIT");

    res.json({
      message: "Блюдо приготовлено ✅"
    });

  } catch (err) {

    await client.query("ROLLBACK");

    console.error("Ошибка приготовления:", err);

    res.status(400).json({
      error: err.message
    });

  } finally {
    client.release();
  }
});
