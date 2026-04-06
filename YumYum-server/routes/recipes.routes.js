// YumYum-server/routes/recipes.routes.js

const express = require("express");
const router = express.Router();
const pool = require("../db");

async function getRecipeIngredients(recipeId) {
  const ingredientsResult = await pool.query(
    `
    SELECT
      ri.ingredient_id,
      ri.product_name,
      ri.quantity,
      ri.unit,
      i.name,
      i.base_unit
    FROM recipe_ingredients ri
    JOIN ingredients i
      ON i.id = ri.ingredient_id
    WHERE ri.recipe_id = $1
    ORDER BY ri.id
    `,
    [recipeId]
  );

  return ingredientsResult.rows;
}

async function getAvailableQuantity(userId, ingredientId, baseUnit) {
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
    [userId, ingredientId, baseUnit]
  );

  return Number(availableResult.rows[0].available);
}

async function buildRecipeCheck(userId, recipeId) {
  const recipeResult = await pool.query(
    `
    SELECT
      id,
      name,
      description,
      cooking_time_min,
      servings,
      recipe_steps,
      category
    FROM recipes
    WHERE id = $1
    `,
    [recipeId]
  );

  if (recipeResult.rows.length === 0) {
    return null;
  }

  const recipe = recipeResult.rows[0];
  const ingredients = await getRecipeIngredients(recipeId);

  const ingredientsStatus = [];

  for (const ingredient of ingredients) {
    const availableQty = await getAvailableQuantity(
      userId,
      ingredient.ingredient_id,
      ingredient.base_unit
    );

    const neededQty = Number(ingredient.quantity);
    const enough = availableQty >= neededQty;
    const remainingAfterCook = enough ? availableQty - neededQty : 0;
    const missingQty = enough ? 0 : neededQty - availableQty;

    ingredientsStatus.push({
      ingredient_id: ingredient.ingredient_id,
      name: ingredient.name,
      needed: neededQty,
      available: availableQty,
      remainingAfterCook,
      missing: missingQty,
      unit: ingredient.base_unit,
      enough,
    });
  }

  const missingProducts = ingredientsStatus
    .filter((item) => !item.enough)
    .map((item) => ({
      name: item.name,
      needed: item.needed,
      available: item.available,
      missing: item.missing,
      unit: item.unit,
    }));

  return {
    recipe,
    canCook: missingProducts.length === 0,
    ingredientsStatus,
    missingProducts,
  };
}

router.get("/", async (req, res) => {
  const userId = 1;

  try {
    const recipesResult = await pool.query(`
      SELECT
        id,
        name,
        description,
        cooking_time_min,
        servings,
        recipe_steps,
        category
      FROM recipes
      ORDER BY id DESC
    `);

    const recipes = [];

    for (const recipe of recipesResult.rows) {
      const check = await buildRecipeCheck(userId, recipe.id);

      recipes.push({
        ...recipe,
        can_cook: check ? check.canCook : false,
      });
    }

    res.json(recipes);
  } catch (err) {
    console.error("Ошибка получения рецептов:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/available", async (req, res) => {
  const userId = 1;

  try {
    const recipesResult = await pool.query(`
      SELECT
        id,
        name,
        description,
        cooking_time_min,
        servings,
        recipe_steps,
        category
      FROM recipes
      ORDER BY id DESC
    `);

    const availableRecipes = [];

    for (const recipe of recipesResult.rows) {
      const check = await buildRecipeCheck(userId, recipe.id);

      if (check?.canCook) {
        availableRecipes.push({
          ...recipe,
          can_cook: true,
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

router.get("/missing", async (req, res) => {
  const userId = 1;

  try {
    const recipesResult = await pool.query(`
      SELECT
        id,
        name,
        description,
        cooking_time_min,
        servings,
        recipe_steps,
        category
      FROM recipes
      ORDER BY id DESC
    `);

    const recipesWithMissing = [];

    for (const recipe of recipesResult.rows) {
      const check = await buildRecipeCheck(userId, recipe.id);

      if (check && !check.canCook) {
        recipesWithMissing.push({
          ...recipe,
          can_cook: false,
          missingIngredients: check.missingProducts,
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

router.post("/", async (req, res) => {
  const {
    name,
    description,
    cooking_time_min,
    servings,
    recipe_steps,
    category,
    ingredients,
  } = req.body;

  const trimmedName = String(name || "").trim();
  const trimmedDescription = String(description || "").trim();
  const normalizedCategory = String(category || "Другое").trim() || "Другое";

  const parsedCookingTime =
    cooking_time_min === "" || cooking_time_min == null
      ? null
      : Number(cooking_time_min);

  const parsedServings =
    servings === "" || servings == null ? null : Number(servings);

  const normalizedSteps = Array.isArray(recipe_steps)
    ? recipe_steps.map((step) => String(step || "").trim()).filter(Boolean)
    : [];

  const normalizedIngredients = Array.isArray(ingredients)
    ? ingredients
        .map((item) => ({
          name: String(item?.name || "").trim(),
          quantity: Number(item?.quantity),
          unit: String(item?.unit || "").trim().toLowerCase(),
        }))
        .filter((item) => item.name && item.quantity > 0 && item.unit)
    : [];

  if (!trimmedName) {
    return res.status(400).json({
      error: "Название рецепта обязательно",
    });
  }

  if (!normalizedIngredients.length) {
    return res.status(400).json({
      error: "Нужно добавить хотя бы один ингредиент",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const recipeInsertResult = await client.query(
      `
      INSERT INTO recipes (
        name,
        description,
        cooking_time_min,
        servings,
        recipe_steps,
        category
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
      `,
      [
        trimmedName,
        trimmedDescription || null,
        Number.isNaN(parsedCookingTime) ? null : parsedCookingTime,
        Number.isNaN(parsedServings) ? null : parsedServings,
        normalizedSteps,
        normalizedCategory,
      ]
    );

    const recipeId = recipeInsertResult.rows[0].id;

    for (const ingredient of normalizedIngredients) {
      const ingredientResult = await client.query(
        `
        SELECT id, name, base_unit
        FROM ingredients
        WHERE LOWER(name) = LOWER($1)
        LIMIT 1
        `,
        [ingredient.name]
      );

      if (ingredientResult.rows.length === 0) {
        throw new Error(`Ингредиент "${ingredient.name}" не найден`);
      }

      const ingredientRow = ingredientResult.rows[0];

      if (ingredient.unit !== ingredientRow.base_unit) {
        throw new Error(
          `Для ингредиента "${ingredientRow.name}" используй единицу "${ingredientRow.base_unit}"`
        );
      }

      await client.query(
        `
        INSERT INTO recipe_ingredients (
          recipe_id,
          ingredient_id,
          product_name,
          quantity,
          unit
        )
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          recipeId,
          ingredientRow.id,
          ingredientRow.name,
          ingredient.quantity,
          ingredient.unit,
        ]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Рецепт создан",
      recipeId,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Ошибка создания рецепта:", err);

    res.status(400).json({
      error: err.message || "Не удалось создать рецепт",
    });
  } finally {
    client.release();
  }
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const recipe = await pool.query(
      `
      SELECT
        id,
        name,
        description,
        cooking_time_min,
        servings,
        recipe_steps,
        category
      FROM recipes
      WHERE id = $1
      `,
      [id]
    );

    if (recipe.rows.length === 0) {
      return res.status(404).json({
        error: "Рецепт не найден",
      });
    }

    const ingredients = await pool.query(
      `
      SELECT
        ri.ingredient_id,
        ri.product_name,
        i.name,
        ri.quantity,
        ri.unit
      FROM recipe_ingredients ri
      JOIN ingredients i
        ON i.id = ri.ingredient_id
      WHERE ri.recipe_id = $1
      ORDER BY ri.id
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

router.get("/:id/check", async (req, res) => {
  const recipeId = req.params.id;
  const userId = 1;

  try {
    const check = await buildRecipeCheck(userId, recipeId);

    if (!check) {
      return res.status(404).json({
        error: "Рецепт не найден",
      });
    }

    res.json(check);
  } catch (err) {
    console.error("Ошибка проверки рецепта:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/:id/cook", async (req, res) => {
  const recipeId = req.params.id;
  const userId = 1;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const recipeResult = await client.query(
      `
      SELECT id, name
      FROM recipes
      WHERE id = $1
      `,
      [recipeId]
    );

    if (recipeResult.rows.length === 0) {
      throw new Error("Рецепт не найден");
    }

    const ingredientsResult = await client.query(
      `
      SELECT
        ri.ingredient_id,
        ri.product_name,
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

router.delete("/:id", async (req, res) => {
  const recipeId = req.params.id;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const recipeResult = await client.query(
      `
      SELECT id
      FROM recipes
      WHERE id = $1
      `,
      [recipeId]
    );

    if (recipeResult.rows.length === 0) {
      throw new Error("Рецепт не найден");
    }

    await client.query(
      `
      DELETE FROM recipe_ingredients
      WHERE recipe_id = $1
      `,
      [recipeId]
    );

    await client.query(
      `
      DELETE FROM recipes
      WHERE id = $1
      `,
      [recipeId]
    );

    await client.query("COMMIT");

    res.json({
      message: "Рецепт удалён",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Ошибка удаления рецепта:", err);

    res.status(400).json({
      error: err.message || "Не удалось удалить рецепт",
    });
  } finally {
    client.release();
  }
});

module.exports = router;