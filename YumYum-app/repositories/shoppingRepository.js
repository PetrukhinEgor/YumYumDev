import { getAll, getFirst, initializeDatabase } from "../database/db";

const USER_ID = 1;

export async function buildShoppingList(recipeIds) {
  await initializeDatabase();

  const ids = (Array.isArray(recipeIds) ? recipeIds : [])
    .map((id) => Number(id))
    .filter(Boolean);

  if (!ids.length) return [];

  const placeholders = ids.map(() => "?").join(", ");
  const ingredients = await getAll(
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
    ids
  );

  const shoppingList = [];

  for (const ingredient of ingredients) {
    const availableRow = await getFirst(
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

  return shoppingList;
}
