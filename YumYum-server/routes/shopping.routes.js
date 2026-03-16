const express = require("express");
const router = express.Router();
const pool = require("../db");

/*
================================
Сформировать список покупок
POST /api/shopping-list
================================
*/

router.post("/", async (req, res) => {

  const userId = 1;
  const { recipes } = req.body;

  if (!recipes || recipes.length === 0) {
    return res.status(400).json({
      error: "Не передан список рецептов"
    });
  }

  try {

    /*
    ================================
    1. Получаем все ингредиенты рецептов
    ================================
    */

    const ingredientsResult = await pool.query(
      `
      SELECT
        ri.ingredient_id,
        i.name,
        SUM(ri.quantity) AS total_needed
      FROM recipe_ingredients ri
      JOIN ingredients i
        ON i.id = ri.ingredient_id
      WHERE ri.recipe_id = ANY($1)
      GROUP BY ri.ingredient_id, i.name
      `,
      [recipes]
    );

    const ingredients = ingredientsResult.rows;

    const shoppingList = [];

    /*
    ================================
    2. Проверяем продукты пользователя
    ================================
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
        [userId, ingredient.ingredient_id]
      );

      const available = Number(productResult.rows[0].quantity);
      const needed = Number(ingredient.total_needed);

      /*
      ================================
      3. Если не хватает
      ================================
      */

      if (available < needed) {

        shoppingList.push({
          name: ingredient.name,
          needed: needed,
          available: available,
          toBuy: needed - available
        });

      }

    }

    /*
    ================================
    4. Ответ
    ================================
    */

    res.json({
      shoppingList
    });

  } catch (err) {

    console.error("Ошибка формирования списка покупок:", err);

    res.status(500).json({
      error: "Ошибка сервера"
    });

  }

});

module.exports = router;