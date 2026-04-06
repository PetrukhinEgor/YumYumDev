// YumYum-server/routes/products.routes.js

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
    const ingredientName = matchIngredient(trimmedName);

    let ingredientId = null;
    let baseUnit = null;

    if (ingredientName) {
      const ingredientResult = await pool.query(
        `
        SELECT id, base_unit
        FROM ingredients
        WHERE name = $1
        `,
        [ingredientName]
      );

      if (ingredientResult.rows.length > 0) {
        ingredientId = ingredientResult.rows[0].id;
        baseUnit = ingredientResult.rows[0].base_unit;
      }
    }

    let normalizedQuantity = null;
    let normalizedUnit = null;

    if (baseUnit && baseUnit === normalizedInputUnit) {
      normalizedQuantity = parsedQuantity;
      normalizedUnit = normalizedInputUnit;
    }

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

  const updates = [];
  const values = [];
  let valueIndex = 1;

  if (name !== undefined) {
    const trimmedName = String(name).trim();

    if (!trimmedName) {
      return res.status(400).json({
        error: "Название не может быть пустым",
      });
    }

    updates.push(`name = $${valueIndex++}`);
    values.push(trimmedName);
  }

  if (quantity !== undefined) {
    const parsedQuantity = Number(quantity);

    if (!parsedQuantity || parsedQuantity <= 0) {
      return res.status(400).json({
        error: "Количество должно быть больше нуля",
      });
    }

    updates.push(`quantity = $${valueIndex++}`);
    values.push(parsedQuantity);
  }

  if (unit !== undefined) {
    const normalizedUnit = String(unit).trim().toLowerCase();

    if (!["g", "ml", "pcs"].includes(normalizedUnit)) {
      return res.status(400).json({
        error: "Допустимые единицы: g, ml, pcs",
      });
    }

    updates.push(`unit = $${valueIndex++}`);
    values.push(normalizedUnit);
  }

  if (updates.length === 0) {
    return res.status(400).json({
      error: "Нет данных для обновления",
    });
  }

  values.push(id);
  values.push(userId);

  try {
    const result = await pool.query(
      `
      UPDATE products
      SET ${updates.join(", ")}
      WHERE id = $${valueIndex++}
        AND user_id = $${valueIndex}
      RETURNING *
      `,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Продукт не найден",
      });
    }

    res.json({
      message: "Продукт обновлён",
      product: result.rows[0],
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