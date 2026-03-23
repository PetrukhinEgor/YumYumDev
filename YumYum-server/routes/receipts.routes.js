// YumYum-server/routes/receipts.routes.js

const express = require("express");
const axios = require("axios");
const pool = require("../db");
const {
  matchIngredient,
  isNonFoodProduct,
  isLikelyFoodProduct,
} = require("../utils/productMatcher");
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

    const savedItems = [];
    const skippedItems = [];

    for (const item of items) {
      const originalName = item.name?.trim();

      if (!originalName) {
        skippedItems.push({
          name: item.name || null,
          reason: "empty_name",
        });
        continue;
      }

      if (isNonFoodProduct(originalName)) {
        skippedItems.push({
          name: originalName,
          reason: "non_food",
        });
        continue;
      }

      const ingredientName = matchIngredient(originalName);

      if (!ingredientName && !isLikelyFoodProduct(originalName)) {
        skippedItems.push({
          name: originalName,
          reason: "unknown_non_food_or_unclear",
        });
        continue;
      }

      let ingredientId = null;
      let baseUnit = null;
      let normalizedQuantity = null;
      let normalizedUnit = null;

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

      if (baseUnit) {
        const parsedAmount = parseProductAmount(
          originalName,
          baseUnit,
          ingredientName
        );

        normalizedQuantity = parsedAmount.normalizedQuantity;
        normalizedUnit = parsedAmount.normalizedUnit;
      }

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
          normalized_unit = COALESCE(products.normalized_unit, EXCLUDED.normalized_unit),
          unit = COALESCE(products.unit, EXCLUDED.unit)
        `,
        [
          1,
          originalName,
          1,
          baseUnit || null,
          ingredientId,
          normalizedQuantity,
          normalizedUnit,
        ]
      );

      savedItems.push({
        name: originalName,
        ingredientName,
        ingredientId,
        normalizedQuantity,
        normalizedUnit,
      });
    }

    await pool.query("COMMIT");

    res.json({
      message: "Чек обработан",
      totalItems: items.length,
      savedCount: savedItems.length,
      skippedCount: skippedItems.length,
      savedItems,
      skippedItems,
      rawResponse: response.data,
    });
  } catch (error) {
    if (transactionStarted) {
      await pool.query("ROLLBACK");
    }

    console.error(
      "Ошибка получения данных чека:",
      error.response?.data || error.message
    );

    res.status(500).json({
      error: "Ошибка получения данных чека",
    });
  }
});

module.exports = router;