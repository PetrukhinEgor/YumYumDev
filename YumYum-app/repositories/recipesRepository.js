import { getAll, getFirst, initializeDatabase, run } from "../database/db";

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

async function getRecipeIngredients(recipeId) {
  return getAll(
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

async function getAvailableQuantity(ingredientId, baseUnit) {
  const row = await getFirst(
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
    [baseUnit, USER_ID, ingredientId]
  );

  return Number(row?.available || 0);
}

export async function checkRecipe(recipeId) {
  await initializeDatabase();

  const recipeRow = await getFirst(
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

  if (!recipeRow) return null;

  const recipe = parseRecipeSteps(recipeRow);
  const ingredients = await getRecipeIngredients(recipeId);
  const ingredientsStatus = [];

  for (const ingredient of ingredients) {
    const availableQty = await getAvailableQuantity(
      ingredient.ingredient_id,
      ingredient.base_unit
    );
    const neededQty = Number(ingredient.quantity);
    const enough = availableQty >= neededQty;

    ingredientsStatus.push({
      ingredient_id: ingredient.ingredient_id,
      name: ingredient.name,
      needed: neededQty,
      available: availableQty,
      remainingAfterCook: enough ? availableQty - neededQty : 0,
      missing: enough ? 0 : neededQty - availableQty,
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

export async function listRecipes(filter) {
  await initializeDatabase();

  const recipeRows = await getAll(
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
    const check = await checkRecipe(recipe.id);
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

export async function getRecipe(recipeId) {
  await initializeDatabase();

  const recipeRow = await getFirst(
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

  if (!recipeRow) return null;

  const ingredients = await getAll(
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
    [recipeId]
  );

  return {
    ...parseRecipeSteps(recipeRow),
    ingredients,
  };
}

export async function createRecipe(payload) {
  await initializeDatabase();

  const normalizedIngredients = Array.isArray(payload.ingredients)
    ? payload.ingredients
        .map((item) => ({
          name: String(item?.name || "").trim(),
          quantity: Number(item?.quantity),
          unit: String(item?.unit || "").trim().toLowerCase(),
        }))
        .filter((item) => item.name && item.quantity > 0 && item.unit)
    : [];

  if (!String(payload.name || "").trim()) {
    throw new Error("Название рецепта обязательно");
  }

  if (!normalizedIngredients.length) {
    throw new Error("Нужно добавить хотя бы один ингредиент");
  }

  const result = await run(
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
      String(payload.name || "").trim(),
      String(payload.description || "").trim() || null,
      payload.cooking_time_min == null ? null : Number(payload.cooking_time_min),
      payload.servings == null ? null : Number(payload.servings),
      JSON.stringify(Array.isArray(payload.recipe_steps) ? payload.recipe_steps : []),
      String(payload.category || "Другое").trim() || "Другое",
    ]
  );

  const recipeId = Number(result.lastInsertRowId || result.lastInsertRowid);

  for (const ingredient of normalizedIngredients) {
    const ingredientRow = await getFirst(
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

    await run(
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
      [recipeId, ingredientRow.id, ingredientRow.name, ingredient.quantity, ingredient.unit]
    );
  }

  return recipeId;
}

export async function cookRecipe(recipeId) {
  await initializeDatabase();

  const check = await checkRecipe(recipeId);

  if (!check) throw new Error("Рецепт не найден");
  if (!check.canCook) throw new Error("Недостаточно продуктов");

  const ingredients = await getRecipeIngredients(recipeId);

  for (const ingredient of ingredients) {
    let remaining = Number(ingredient.quantity);

    const products = await getAll(
      `
      SELECT id, normalized_quantity
      FROM products
      WHERE user_id = ?
        AND ingredient_id = ?
        AND normalized_quantity > 0
        AND normalized_unit = ?
        AND (expires_at IS NULL OR expires_at >= date('now', 'localtime'))
      ORDER BY
        CASE WHEN expires_at IS NULL THEN 1 ELSE 0 END,
        expires_at,
        created_at,
        id
      `,
      [USER_ID, ingredient.ingredient_id, ingredient.base_unit]
    );

    for (const product of products) {
      if (remaining <= 0) break;

      const available = Number(product.normalized_quantity);
      const toSubtract = Math.min(available, remaining);

      await run(
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
}

export async function deleteRecipe(recipeId) {
  await initializeDatabase();

  await run("DELETE FROM recipe_ingredients WHERE recipe_id = ?", [recipeId]);
  await run("DELETE FROM recipes WHERE id = ?", [recipeId]);
}
