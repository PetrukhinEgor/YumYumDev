const express = require("express");
const router = express.Router();
const { all, get } = require("../db");

const USER_ID = 1;

router.post("/", (req, res) => {
  const { recipes } = req.body;

  if (!recipes || !Array.isArray(recipes) || recipes.length === 0) {
    return res.status(400).json({
      error: "Не передан список рецептов",
    });
  }

  try {
    const recipeIds = recipes.map((id) => Number(id)).filter(Boolean);

    if (recipeIds.length === 0) {
      return res.status(400).json({
        error: "Не передан список рецептов",
      });
    }

    const placeholders = recipeIds.map(() => "?").join(", ");

    const ingredients = all(
      `
      SELECT
        ri.ingredient_id,
        i.name,
        i.base_unit,
        SUM(ri.quantity) AS total_needed
      FROM recipe_ingredients ri
      JOIN ingredients i
        ON i.id = ri.ingredient_id
      WHERE ri.recipe_id IN (${placeholders})
      GROUP BY ri.ingredient_id, i.name, i.base_unit
      ORDER BY i.name
      `,
      recipeIds
    );

    const shoppingList = [];

    for (const ingredient of ingredients) {
      const availableRow = get(
        `
        SELECT COALESCE(
          SUM(
            CASE
              WHEN normalized_quantity > 0
               AND normalized_unit = ?
              THEN normalized_quantity
              ELSE 0
            END
          ),
        0) AS available
        FROM products
        WHERE user_id = ?
          AND ingredient_id = ?
          AND (expires_at IS NULL OR expires_at >= date('now', 'localtime'))
        `,
        [ingredient.base_unit, USER_ID, ingredient.ingredient_id]
      );

      const available = Number(availableRow?.available || 0);
      const needed = Number(ingredient.total_needed);

      if (available < needed) {
        shoppingList.push({
          name: ingredient.name,
          unit: ingredient.base_unit,
          needed,
          available,
          toBuy: needed - available,
        });
      }
    }

    res.json({
      shoppingList,
    });
  } catch (err) {
    console.error("Shopping list error:", err);

    res.status(500).json({
      error: "Ошибка сервера",
    });
  }
});

module.exports = router;
