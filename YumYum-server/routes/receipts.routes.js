// YumYum-server/routes/receipts.routes.js

const express = require("express");
const axios = require("axios");
const pool = require("../db");
const matchIngredient = require("../utils/productMatcher");
const parseProductAmount = require("../utils/parseProductAmount");

const router = express.Router();

router.post("/scan", async (req, res) => {
  let transactionStarted = false;

  try {
    const { qr } = req.body;

    if (!qr) {
      return res.status(400).json({
        error: "QR-строка не передана",
      });
    }

    const formData = new URLSearchParams();
    formData.append("token", process.env.PROVERKA_TOKEN);
    formData.append("qrraw", qr);

    const response = await axios.post(
      "https://proverkacheka.com/api/v1/check/get",
      formData,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 10000,
      }
    );

    const items = response.data?.data?.json?.items || [];

    await pool.query("BEGIN");
    transactionStarted = true;

    for (const item of items) {
      const originalName = item.name;
      const ingredientName = matchIngredient(originalName);

      let ingredientId = null;
      let baseUnit = null;
      let normalizedQuantity = null;
      let normalizedUnit = null;

      // 1. Ищем ingredient_id и base_unit
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

      // 2. Пытаемся распарсить количество из названия товара
      if (baseUnit) {
        const parsedAmount = parseProductAmount(originalName, baseUnit, ingredientName);

        normalizedQuantity = parsedAmount.normalizedQuantity;
        normalizedUnit = parsedAmount.normalizedUnit;
      }

      // 3. Сохраняем товар
      // Старая логика quantity=1 пока остается для обратной совместимости.
      // Новая логика идет в normalized_quantity / normalized_unit.
      await pool.query(
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
          ingredient_id = COALESCE(products.ingredient_id, EXCLUDED.ingredient_id),
          normalized_quantity = CASE
            WHEN products.normalized_quantity IS NOT NULL
             AND EXCLUDED.normalized_quantity IS NOT NULL
            THEN products.normalized_quantity + EXCLUDED.normalized_quantity
            ELSE COALESCE(products.normalized_quantity, EXCLUDED.normalized_quantity)
          END,
          normalized_unit = COALESCE(products.normalized_unit, EXCLUDED.normalized_unit)
        `,
        [
          1,                     // пока тестовый пользователь
          originalName,
          1,                     // старая логика для обратной совместимости
          baseUnit || null,      // временно сохраняем unit как базовую единицу, если нашли
          ingredientId,
          normalizedQuantity,
          normalizedUnit,
        ]
      );
    }

    await pool.query("COMMIT");

    res.json(response.data);
  } catch (error) {
    if (transactionStarted) {
      await pool.query("ROLLBACK");
    }

    console.error("Ошибка получения данных чека:", error.response?.data || error.message);

    res.status(500).json({
      error: "Ошибка получения данных чека",
    });
  }
});

module.exports = router;