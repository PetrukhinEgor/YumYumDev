const express = require("express");
const router = express.Router();
const pool = require("../db");
const { matchIngredient } = require("../utils/productMatcher");

function formatAmount(quantity, unit) {
  if (quantity == null || !unit) return null;

  const numeric = Number(quantity);

  if (Number.isNaN(numeric)) return null;

  const value = Number.isInteger(numeric) ? numeric : Number(numeric.toFixed(2));
  return `${value} ${unit}`;
}

async function resolveIngredientData(productName) {
  const ingredientName = matchIngredient(productName);

  if (!ingredientName) {
    return {
      ingredientName: null,
      ingredientId: null,
      baseUnit: null,
    };
  }

  const ingredientResult = await pool.query(
    `
    SELECT id, name, base_unit
    FROM ingredients
    WHERE name = $1
    LIMIT 1
    `,
    [ingredientName]
  );

  if (ingredientResult.rows.length === 0) {
    return {
      ingredientName,
      ingredientId: null,
      baseUnit: null,
    };
  }

  return {
    ingredientName: ingredientResult.rows[0].name,
    ingredientId: ingredientResult.rows[0].id,
    baseUnit: ingredientResult.rows[0].base_unit,
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

router.get("/", async (req, res) => {
  const userId = 1;

  try {
    const result = await pool.query(
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
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC, p.id DESC
      `,
      [userId]
    );

    const products = result.rows.map((row) => ({
      ...row,
      display_amount: formatAmount(row.quantity, row.unit),
    }));

    res.json(products);
  } catch (err) {
    console.error("Ошибка получения продуктов:", err);
    res.status(500).json({
      error: "Ошибка сервера",
    });
  }
});

router.post("/", async (req, res) => {
  const userId = 1;
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

  if (!["g", "ml", "pcs"].includes(normalizedInputUnit)) {
    return res.status(400).json({
      error: "Допустимые единицы: g, ml, pcs",
    });
  }

  try {
    const { ingredientName, ingredientId, baseUnit } =
      await resolveIngredientData(trimmedName);

    const { normalizedQuantity, normalizedUnit } = buildNormalizedData(
      parsedQuantity,
      normalizedInputUnit,
      baseUnit
    );

    const insertResult = await pool.query(
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
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, name)
      DO UPDATE SET
        quantity = products.quantity + EXCLUDED.quantity,
        unit = COALESCE(products.unit, EXCLUDED.unit),
        ingredient_id = COALESCE(products.ingredient_id, EXCLUDED.ingredient_id),
        normalized_quantity = CASE
          WHEN products.normalized_quantity IS NOT NULL
           AND EXCLUDED.normalized_quantity IS NOT NULL
           AND products.normalized_unit = EXCLUDED.normalized_unit
          THEN products.normalized_quantity + EXCLUDED.normalized_quantity
          ELSE COALESCE(products.normalized_quantity, EXCLUDED.normalized_quantity)
        END,
        normalized_unit = COALESCE(products.normalized_unit, EXCLUDED.normalized_unit)
      RETURNING id, name, quantity, unit, ingredient_id, normalized_quantity, normalized_unit
      `,
      [
        userId,
        trimmedName,
        parsedQuantity,
        normalizedInputUnit,
        ingredientId,
        normalizedQuantity,
        normalizedUnit,
      ]
    );

    res.status(201).json({
      message: "Продукт добавлен",
      product: {
        ...insertResult.rows[0],
        ingredient_name: ingredientName || null,
        display_amount: formatAmount(
          insertResult.rows[0].quantity,
          insertResult.rows[0].unit
        ),
      },
    });
  } catch (err) {
    console.error("Ошибка ручного добавления продукта:", err);
    res.status(500).json({
      error: "Ошибка сервера",
    });
  }
});

router.patch("/:id", async (req, res) => {
  const userId = 1;
  const { id } = req.params;
  const { quantity, unit, name } = req.body;

  try {
    const existingResult = await pool.query(
      `
      SELECT *
      FROM products
      WHERE id = $1
        AND user_id = $2
      LIMIT 1
      `,
      [id, userId]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        error: "Продукт не найден",
      });
    }

    const existingProduct = existingResult.rows[0];

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

    if (!["g", "ml", "pcs"].includes(nextUnit)) {
      return res.status(400).json({
        error: "Допустимые единицы: g, ml, pcs",
      });
    }

    const { ingredientName, ingredientId, baseUnit } =
      await resolveIngredientData(nextName);

    const { normalizedQuantity, normalizedUnit } = buildNormalizedData(
      nextQuantity,
      nextUnit,
      baseUnit
    );

    const result = await pool.query(
      `
      UPDATE products
      SET
        name = $1,
        quantity = $2,
        unit = $3,
        ingredient_id = $4,
        normalized_quantity = $5,
        normalized_unit = $6
      WHERE id = $7
        AND user_id = $8
      RETURNING *
      `,
      [
        nextName,
        nextQuantity,
        nextUnit,
        ingredientId,
        normalizedQuantity,
        normalizedUnit,
        id,
        userId,
      ]
    );

    res.json({
      message: "Продукт обновлён",
      product: {
        ...result.rows[0],
        ingredient_name: ingredientName || null,
        display_amount: formatAmount(result.rows[0].quantity, result.rows[0].unit),
      },
    });
  } catch (err) {
    console.error("Ошибка обновления продукта:", err);
    res.status(500).json({
      error: "Ошибка сервера",
    });
  }
});

router.delete("/:id", async (req, res) => {
  const userId = 1;
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
      DELETE FROM products
      WHERE id = $1
        AND user_id = $2
      RETURNING id
      `,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Продукт не найден",
      });
    }

    res.json({
      message: "Продукт удалён",
    });
  } catch (err) {
    console.error("Ошибка удаления продукта:", err);
    res.status(500).json({
      error: "Ошибка сервера",
    });
  }
});

module.exports = router;