const express = require("express");
const router = express.Router();
const { all, get, run } = require("../db");
const { matchIngredient } = require("../utils/productMatcher");

const ALLOWED_UNITS = ["g", "ml", "pcs"];
const USER_ID = 1;

function formatAmount(quantity, unit) {
  if (quantity == null || !unit) return null;

  const numeric = Number(quantity);

  if (Number.isNaN(numeric)) return null;

  const value = Number.isInteger(numeric) ? numeric : Number(numeric.toFixed(2));
  return `${value} ${unit}`;
}

function resolveIngredientData(productName) {
  const ingredientName = matchIngredient(productName);

  if (!ingredientName) {
    return {
      ingredientName: null,
      ingredientId: null,
      baseUnit: null,
    };
  }

  const ingredient = get(
    `
    SELECT id, name, base_unit
    FROM ingredients
    WHERE LOWER(name) = LOWER(?)
    LIMIT 1
    `,
    [ingredientName]
  );

  if (!ingredient) {
    return {
      ingredientName,
      ingredientId: null,
      baseUnit: null,
    };
  }

  return {
    ingredientName: ingredient.name,
    ingredientId: ingredient.id,
    baseUnit: ingredient.base_unit,
  };
}

function buildNormalizedData(quantity, unit, baseUnit) {
  if (quantity == null || !unit || !baseUnit) {
    return {
      normalizedQuantity: null,
      normalizedUnit: null,
    };
  }

  const parsedQuantity = Number(quantity);
  const normalizedInputUnit = String(unit).trim().toLowerCase();

  if (Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
    return {
      normalizedQuantity: null,
      normalizedUnit: null,
    };
  }

  if (normalizedInputUnit === baseUnit) {
    return {
      normalizedQuantity: parsedQuantity,
      normalizedUnit: normalizedInputUnit,
    };
  }

  return {
    normalizedQuantity: null,
    normalizedUnit: null,
  };
}

function findProductByUserAndName(userId, name) {
  return get(
    `
    SELECT
      p.id,
      p.user_id,
      p.name,
      p.quantity,
      p.unit,
      p.expires_at,
      p.created_at,
      p.ingredient_id,
      p.normalized_quantity,
      p.normalized_unit,
      i.name AS ingredient_name
    FROM products p
    LEFT JOIN ingredients i
      ON i.id = p.ingredient_id
    WHERE p.user_id = ?
      AND p.name = ?
    LIMIT 1
    `,
    [userId, name]
  );
}

router.get("/", (req, res) => {
  try {
    const rows = all(
      `
      SELECT
        p.id,
        p.user_id,
        p.name,
        p.quantity,
        p.unit,
        p.expires_at,
        p.created_at,
        p.ingredient_id,
        p.normalized_quantity,
        p.normalized_unit,
        i.name AS ingredient_name
      FROM products p
      LEFT JOIN ingredients i
        ON i.id = p.ingredient_id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC, p.id DESC
      `,
      [USER_ID]
    );

    const products = rows.map((row) => ({
      ...row,
      display_amount: formatAmount(row.quantity, row.unit),
    }));

    res.json(products);
  } catch (err) {
    console.error("Products fetch error:", err);
    res.status(500).json({
      error: "Ошибка сервера",
    });
  }
});

router.post("/", (req, res) => {
  const { name, quantity, unit } = req.body;

  const trimmedName = String(name || "").trim();
  const parsedQuantity = Number(quantity);
  const normalizedInputUnit = String(unit || "").trim().toLowerCase();

  if (!trimmedName) {
    return res.status(400).json({
      error: "Название продукта обязательно",
    });
  }

  if (!parsedQuantity || parsedQuantity <= 0) {
    return res.status(400).json({
      error: "Количество должно быть больше нуля",
    });
  }

  if (!ALLOWED_UNITS.includes(normalizedInputUnit)) {
    return res.status(400).json({
      error: "Допустимые единицы: g, ml, pcs",
    });
  }

  try {
    const { ingredientName, ingredientId, baseUnit } =
      resolveIngredientData(trimmedName);

    const { normalizedQuantity, normalizedUnit } = buildNormalizedData(
      parsedQuantity,
      normalizedInputUnit,
      baseUnit
    );

    run(
      `
      INSERT INTO products (
        user_id,
        name,
        quantity,
        unit,
        ingredient_id,
        normalized_quantity,
        normalized_unit
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, name)
      DO UPDATE SET
        quantity = products.quantity + excluded.quantity,
        unit = COALESCE(products.unit, excluded.unit),
        ingredient_id = COALESCE(products.ingredient_id, excluded.ingredient_id),
        normalized_quantity = CASE
          WHEN products.normalized_quantity IS NOT NULL
           AND excluded.normalized_quantity IS NOT NULL
           AND products.normalized_unit = excluded.normalized_unit
          THEN products.normalized_quantity + excluded.normalized_quantity
          ELSE COALESCE(products.normalized_quantity, excluded.normalized_quantity)
        END,
        normalized_unit = COALESCE(products.normalized_unit, excluded.normalized_unit)
      `,
      [
        USER_ID,
        trimmedName,
        parsedQuantity,
        normalizedInputUnit,
        ingredientId,
        normalizedQuantity,
        normalizedUnit,
      ]
    );

    const product = findProductByUserAndName(USER_ID, trimmedName);

    res.status(201).json({
      message: "Продукт добавлен",
      product: {
        ...product,
        ingredient_name: product?.ingredient_name || ingredientName || null,
        display_amount: formatAmount(product?.quantity, product?.unit),
      },
    });
  } catch (err) {
    console.error("Product create error:", err);
    res.status(500).json({
      error: "Ошибка сервера",
    });
  }
});

router.patch("/:id", (req, res) => {
  const { id } = req.params;
  const { quantity, unit, name } = req.body;

  try {
    const existingProduct = get(
      `
      SELECT *
      FROM products
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
      `,
      [id, USER_ID]
    );

    if (!existingProduct) {
      return res.status(404).json({
        error: "Продукт не найден",
      });
    }

    const nextName =
      name !== undefined ? String(name).trim() : String(existingProduct.name || "").trim();

    const nextQuantity =
      quantity !== undefined ? Number(quantity) : Number(existingProduct.quantity);

    const nextUnit =
      unit !== undefined
        ? String(unit).trim().toLowerCase()
        : String(existingProduct.unit || "").trim().toLowerCase();

    if (!nextName) {
      return res.status(400).json({
        error: "Название не может быть пустым",
      });
    }

    if (!nextQuantity || nextQuantity <= 0) {
      return res.status(400).json({
        error: "Количество должно быть больше нуля",
      });
    }

    if (!ALLOWED_UNITS.includes(nextUnit)) {
      return res.status(400).json({
        error: "Допустимые единицы: g, ml, pcs",
      });
    }

    const { ingredientName, ingredientId, baseUnit } =
      resolveIngredientData(nextName);

    const { normalizedQuantity, normalizedUnit } = buildNormalizedData(
      nextQuantity,
      nextUnit,
      baseUnit
    );

    run(
      `
      UPDATE products
      SET
        name = ?,
        quantity = ?,
        unit = ?,
        ingredient_id = ?,
        normalized_quantity = ?,
        normalized_unit = ?
      WHERE id = ?
        AND user_id = ?
      `,
      [
        nextName,
        nextQuantity,
        nextUnit,
        ingredientId,
        normalizedQuantity,
        normalizedUnit,
        id,
        USER_ID,
      ]
    );

    const product = findProductByUserAndName(USER_ID, nextName);

    res.json({
      message: "Продукт обновлён",
      product: {
        ...product,
        ingredient_name: product?.ingredient_name || ingredientName || null,
        display_amount: formatAmount(product?.quantity, product?.unit),
      },
    });
  } catch (err) {
    console.error("Product update error:", err);
    res.status(500).json({
      error: "Ошибка сервера",
    });
  }
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;

  try {
    const result = run(
      `
      DELETE FROM products
      WHERE id = ?
        AND user_id = ?
      `,
      [id, USER_ID]
    );

    if (result.changes === 0) {
      return res.status(404).json({
        error: "Продукт не найден",
      });
    }

    res.json({
      message: "Продукт удалён",
    });
  } catch (err) {
    console.error("Product delete error:", err);
    res.status(500).json({
      error: "Ошибка сервера",
    });
  }
});

module.exports = router;
