// YumYum-server/routes/products.routes.js

const express = require("express");
const pool = require("../db");
const { matchIngredient } = require("../utils/productMatcher");
const parseProductAmount = require("../utils/parseProductAmount");

const router = express.Router();

/*
================================
Получить продукты пользователя
GET /api/products
================================
*/
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        p.id,
        p.name,
        p.quantity,
        p.unit,
        p.ingredient_id,
        p.normalized_quantity,
        p.normalized_unit,
        p.created_at,
        i.name AS ingredient_name,
        i.base_unit
      FROM products p
      LEFT JOIN ingredients i
        ON i.id = p.ingredient_id
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC, p.id DESC
      `,
      [1]
    );

    const preparedProducts = result.rows.map((product) => {
      let displayAmount = null;

      if (
        product.normalized_quantity !== null &&
        product.normalized_quantity !== undefined &&
        product.normalized_unit
      ) {
        displayAmount = `${Number(product.normalized_quantity)} ${product.normalized_unit}`;
      } else if (
        product.quantity !== null &&
        product.quantity !== undefined &&
        product.unit
      ) {
        displayAmount = `${Number(product.quantity)} ${product.unit}`;
      } else if (
        product.quantity !== null &&
        product.quantity !== undefined
      ) {
        displayAmount = `${Number(product.quantity)} шт`;
      }

      return {
        id: product.id,
        name: product.name,
        quantity: product.quantity,
        unit: product.unit,
        ingredient_id: product.ingredient_id,
        ingredient_name: product.ingredient_name,
        base_unit: product.base_unit,
        normalized_quantity: product.normalized_quantity,
        normalized_unit: product.normalized_unit,
        created_at: product.created_at,
        display_amount: displayAmount,
      };
    });

    res.json(preparedProducts);
  } catch (err) {
    console.error("Ошибка получения продуктов:", err);
    res.status(500).json({ error: "Ошибка получения продуктов" });
  }
});

/*
================================
Пересобрать нормализацию старых продуктов
POST /api/products/rebuild-normalization
================================
*/
router.post("/rebuild-normalization", async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const productsResult = await client.query(
      `
      SELECT id, name, quantity, ingredient_id, normalized_quantity, normalized_unit
      FROM products
      WHERE user_id = $1
      ORDER BY id
      `,
      [1]
    );

    const products = productsResult.rows;

    let updatedCount = 0;
    const updatedProducts = [];
    const skippedProducts = [];

    for (const product of products) {
      const ingredientName = matchIngredient(product.name);

      if (!ingredientName) {
        skippedProducts.push({
          id: product.id,
          name: product.name,
          reason: "ingredient_not_matched",
        });
        continue;
      }

      const ingredientResult = await client.query(
        `
        SELECT id, name, base_unit
        FROM ingredients
        WHERE name = $1
        `,
        [ingredientName]
      );

      if (ingredientResult.rows.length === 0) {
        skippedProducts.push({
          id: product.id,
          name: product.name,
          reason: "ingredient_not_found_in_db",
          ingredientName,
        });
        continue;
      }

      const ingredient = ingredientResult.rows[0];

      const parsedAmount = parseProductAmount(
        product.name,
        ingredient.base_unit,
        ingredient.name
      );

      let normalizedQuantity = parsedAmount.normalizedQuantity;
      let normalizedUnit = parsedAmount.normalizedUnit;

      // если в названии не удалось вытащить количество,
      // но базовая единица = pcs, используем quantity записи
      if (
        (normalizedQuantity === null || normalizedQuantity === undefined) &&
        ingredient.base_unit === "pcs" &&
        product.quantity !== null &&
        product.quantity !== undefined
      ) {
        normalizedQuantity = Number(product.quantity);
        normalizedUnit = "pcs";
      }

      await client.query(
        `
        UPDATE products
        SET
          ingredient_id = $1,
          unit = COALESCE($2, unit),
          normalized_quantity = $3,
          normalized_unit = $4
        WHERE id = $5
        `,
        [
          ingredient.id,
          ingredient.base_unit,
          normalizedQuantity,
          normalizedUnit,
          product.id,
        ]
      );

      updatedCount += 1;
      updatedProducts.push({
        id: product.id,
        name: product.name,
        ingredientName: ingredient.name,
        ingredientId: ingredient.id,
        normalizedQuantity,
        normalizedUnit,
      });
    }

    await client.query("COMMIT");

    res.json({
      message: "Пересборка нормализации завершена",
      totalProducts: products.length,
      updatedCount,
      skippedCount: skippedProducts.length,
      updatedProducts,
      skippedProducts,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Ошибка пересборки нормализации:", err);
    res.status(500).json({
      error: "Ошибка пересборки нормализации",
    });
  } finally {
    client.release();
  }
});

/*
================================
Удалить продукт
DELETE /api/products/:id
================================
*/
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `
      DELETE FROM products
      WHERE id = $1 AND user_id = $2
      `,
      [id, 1]
    );

    res.json({ message: "Продукт удалён" });
  } catch (err) {
    console.error("Ошибка удаления продукта:", err);
    res.status(500).json({ error: "Ошибка удаления" });
  }
});

/*
================================
Обновить количество продукта
PATCH /api/products/:id
================================
*/
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    await pool.query(
      `
      UPDATE products
      SET quantity = $1
      WHERE id = $2 AND user_id = $3
      `,
      [quantity, id, 1]
    );

    res.json({ message: "Количество обновлено" });
  } catch (err) {
    console.error("Ошибка обновления количества:", err);
    res.status(500).json({ error: "Ошибка обновления" });
  }
});

module.exports = router;