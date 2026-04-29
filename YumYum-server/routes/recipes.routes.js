const express = require("express");
const router = express.Router();
const { all, get, run, transaction } = require("../db");

const USER_ID = 1;

function parseRecipeSteps(recipe) {
  if (!recipe) return recipe;

  let recipeSteps = [];

  if (recipe.recipe_steps) {
    try {
      recipeSteps = JSON.parse(recipe.recipe_steps);
    } catch {
      recipeSteps = [];
    }
  }

  return {
    ...recipe,
    recipe_steps: recipeSteps,
  };
}

function getRecipeIngredients(recipeId) {
  return all(
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
    WHERE ri.recipe_id = ?
    ORDER BY ri.id
    `,
    [recipeId]
  );
}

function getAvailableQuantity(userId, ingredientId, baseUnit) {
  const row = get(
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
    `,
    [baseUnit, userId, ingredientId]
  );

  return Number(row?.available || 0);
}

function buildRecipeCheck(userId, recipeId) {
  const recipeRow = get(
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
    WHERE id = ?
    `,
    [recipeId]
  );

  if (!recipeRow) {
    return null;
  }

  const recipe = parseRecipeSteps(recipeRow);
  const ingredients = getRecipeIngredients(recipeId);
  const ingredientsStatus = [];

  for (const ingredient of ingredients) {
    const availableQty = getAvailableQuantity(
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

function listRecipesWithCookStatus(filter) {
  const recipeRows = all(
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
    ORDER BY id DESC
    `
  );

  const recipes = [];

  for (const recipeRow of recipeRows) {
    const recipe = parseRecipeSteps(recipeRow);
    const check = buildRecipeCheck(USER_ID, recipe.id);
    const canCook = check ? check.canCook : false;

    if (filter === "available" && !canCook) continue;
    if (filter === "missing" && canCook) continue;

    recipes.push({
      ...recipe,
      can_cook: canCook,
      ...(filter === "missing" && check
        ? { missingIngredients: check.missingProducts }
        : {}),
    });
  }

  return recipes;
}

router.get("/", (req, res) => {
  try {
    res.json(listRecipesWithCookStatus());
  } catch (err) {
    console.error("Recipes fetch error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/available", (req, res) => {
  try {
    res.json(listRecipesWithCookStatus("available"));
  } catch (err) {
    console.error("Available recipes fetch error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/missing", (req, res) => {
  try {
    res.json(listRecipesWithCookStatus("missing"));
  } catch (err) {
    console.error("Missing recipes fetch error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/", (req, res) => {
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

  try {
    const createRecipeTransaction = transaction(() => {
      const recipeResult = run(
        `
        INSERT INTO recipes (
          name,
          description,
          cooking_time_min,
          servings,
          recipe_steps,
          category
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          trimmedName,
          trimmedDescription || null,
          Number.isNaN(parsedCookingTime) ? null : parsedCookingTime,
          Number.isNaN(parsedServings) ? null : parsedServings,
          JSON.stringify(normalizedSteps),
          normalizedCategory,
        ]
      );

      const recipeId = Number(recipeResult.lastInsertRowid);

      for (const ingredient of normalizedIngredients) {
        const ingredientRow = get(
          `
          SELECT id, name, base_unit
          FROM ingredients
          WHERE LOWER(name) = LOWER(?)
          LIMIT 1
          `,
          [ingredient.name]
        );

        if (!ingredientRow) {
          throw new Error(`Ингредиент "${ingredient.name}" не найден`);
        }

        if (ingredient.unit !== ingredientRow.base_unit) {
          throw new Error(
            `Для ингредиента "${ingredientRow.name}" используй единицу "${ingredientRow.base_unit}"`
          );
        }

        run(
          `
          INSERT INTO recipe_ingredients (
            recipe_id,
            ingredient_id,
            product_name,
            quantity,
            unit
          )
          VALUES (?, ?, ?, ?, ?)
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

      return recipeId;
    });

    const recipeId = createRecipeTransaction();

    res.status(201).json({
      message: "Рецепт создан",
      recipeId,
    });
  } catch (err) {
    console.error("Recipe create error:", err);

    res.status(400).json({
      error: err.message || "Не удалось создать рецепт",
    });
  }
});

router.get("/:id", (req, res) => {
  const { id } = req.params;

  try {
    const recipeRow = get(
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
      WHERE id = ?
      `,
      [id]
    );

    if (!recipeRow) {
      return res.status(404).json({
        error: "Рецепт не найден",
      });
    }

    const ingredients = all(
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
      WHERE ri.recipe_id = ?
      ORDER BY ri.id
      `,
      [id]
    );

    res.json({
      ...parseRecipeSteps(recipeRow),
      ingredients,
    });
  } catch (err) {
    console.error("Recipe fetch error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/:id/check", (req, res) => {
  const recipeId = req.params.id;

  try {
    const check = buildRecipeCheck(USER_ID, recipeId);

    if (!check) {
      return res.status(404).json({
        error: "Рецепт не найден",
      });
    }

    res.json(check);
  } catch (err) {
    console.error("Recipe check error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/:id/cook", (req, res) => {
  const recipeId = req.params.id;

  try {
    const cookTransaction = transaction(() => {
      const recipe = get(
        `
        SELECT id, name
        FROM recipes
        WHERE id = ?
        `,
        [recipeId]
      );

      if (!recipe) {
        throw new Error("Рецепт не найден");
      }

      const ingredients = getRecipeIngredients(recipeId);

      for (const ingredient of ingredients) {
        const availableQty = getAvailableQuantity(
          USER_ID,
          ingredient.ingredient_id,
          ingredient.base_unit
        );

        const neededQty = Number(ingredient.quantity);

        if (availableQty < neededQty) {
          throw new Error(`Недостаточно продукта: ${ingredient.name}`);
        }
      }

      for (const ingredient of ingredients) {
        let remaining = Number(ingredient.quantity);

        const products = all(
          `
          SELECT id, normalized_quantity
          FROM products
          WHERE user_id = ?
            AND ingredient_id = ?
            AND normalized_quantity > 0
            AND normalized_unit = ?
          ORDER BY created_at, id
          `,
          [USER_ID, ingredient.ingredient_id, ingredient.base_unit]
        );

        for (const product of products) {
          if (remaining <= 0) break;

          const available = Number(product.normalized_quantity);
          const toSubtract = Math.min(available, remaining);

          run(
            `
            UPDATE products
            SET normalized_quantity = normalized_quantity - ?
            WHERE id = ?
            `,
            [toSubtract, product.id]
          );

          remaining -= toSubtract;
        }
      }
    });

    cookTransaction();

    res.json({
      message: "Блюдо приготовлено",
    });
  } catch (err) {
    console.error("Recipe cook error:", err);

    res.status(400).json({
      error: err.message,
    });
  }
});

router.delete("/:id", (req, res) => {
  const recipeId = req.params.id;

  try {
    const deleteTransaction = transaction(() => {
      const recipe = get(
        `
        SELECT id
        FROM recipes
        WHERE id = ?
        `,
        [recipeId]
      );

      if (!recipe) {
        throw new Error("Рецепт не найден");
      }

      run(
        `
        DELETE FROM recipe_ingredients
        WHERE recipe_id = ?
        `,
        [recipeId]
      );

      run(
        `
        DELETE FROM recipes
        WHERE id = ?
        `,
        [recipeId]
      );
    });

    deleteTransaction();

    res.json({
      message: "Рецепт удалён",
    });
  } catch (err) {
    console.error("Recipe delete error:", err);

    res.status(400).json({
      error: err.message || "Не удалось удалить рецепт",
    });
  }
});

module.exports = router;
