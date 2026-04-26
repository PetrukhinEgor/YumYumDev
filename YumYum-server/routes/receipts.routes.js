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

const ALLOWED_UNITS = ["g", "ml", "pcs"];

async function resolveIngredientByName(ingredientName) {
  const trimmedName = String(ingredientName || "").trim();

  if (!trimmedName) {
    return {
      ingredientId: null,
      ingredientName: "",
      baseUnit: null,
    };
  }

  const result = await pool.query(
    `
    SELECT id, name, base_unit
    FROM ingredients
    WHERE LOWER(name) = LOWER($1)
    LIMIT 1
    `,
    [trimmedName],
  );

  if (result.rows.length === 0) {
    return {
      ingredientId: null,
      ingredientName: trimmedName,
      baseUnit: null,
    };
  }

  return {
    ingredientId: result.rows[0].id,
    ingredientName: result.rows[0].name,
    baseUnit: result.rows[0].base_unit,
  };
}

function normalizeEditableQuantity(quantity) {
  if (quantity === "" || quantity == null) return null;

  const parsed = Number(quantity);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function normalizeEditableUnit(unit) {
  const normalized = String(unit || "")
    .trim()
    .toLowerCase();
  return ALLOWED_UNITS.includes(normalized) ? normalized : null;
}

async function buildReceiptDraftItem(item, index) {
  const originalName = String(item?.name || "").trim();

  if (!originalName) {
    return {
      draftId: String(index),
      originalName: item?.name || "",
      name: "",
      include: false,
      isEdible: false,
      ingredientName: "",
      suggestedIngredientName: "",
      ingredientId: null,
      quantity: null,
      unit: null,
      reason: "empty_name",
      status: "skipped",
      receiptQuantity: item?.quantity ?? null,
    };
  }

  if (isNonFoodProduct(originalName)) {
    return {
      draftId: String(index),
      originalName,
      name: originalName,
      include: false,
      isEdible: false,
      ingredientName: "",
      suggestedIngredientName: "",
      ingredientId: null,
      quantity: null,
      unit: null,
      reason: "non_food",
      status: "skipped",
      receiptQuantity: item?.quantity ?? null,
    };
  }

  const suggestedIngredientName = matchIngredient(originalName) || "";
  const likelyFood = Boolean(
    suggestedIngredientName || isLikelyFoodProduct(originalName),
  );

  if (!likelyFood) {
    return {
      draftId: String(index),
      originalName,
      name: originalName,
      include: false,
      isEdible: false,
      ingredientName: "",
      suggestedIngredientName: "",
      ingredientId: null,
      quantity: null,
      unit: null,
      reason: "unknown_non_food_or_unclear",
      status: "skipped",
      receiptQuantity: item?.quantity ?? null,
    };
  }

  let ingredientId = null;
  let baseUnit = null;
  let resolvedIngredientName = suggestedIngredientName;
  let quantity = null;
  let unit = null;

  if (suggestedIngredientName) {
    const ingredientData = await resolveIngredientByName(
      suggestedIngredientName,
    );
    ingredientId = ingredientData.ingredientId;
    baseUnit = ingredientData.baseUnit;
    resolvedIngredientName = ingredientData.ingredientName;
  }

  const receiptQuantity = Number(item?.quantity);

  if (baseUnit) {
    let parsedAmount = null;

    try {
      parsedAmount = parseProductAmount(
        originalName,
        baseUnit,
        resolvedIngredientName,
      );
    } catch (error) {
      console.warn("parseProductAmount warning:", error.message);
      parsedAmount = null;
    }

    const isWeightedKgItem =
      baseUnit === "g" &&
      !Number.isNaN(receiptQuantity) &&
      receiptQuantity > 0 &&
      (Number(item?.itemsQuantityMeasure) === 11 ||
        originalName.toLowerCase().includes(", кг"));

    if (isWeightedKgItem) {
      quantity = Math.round(receiptQuantity * 1000);
      unit = "g";
    } else if (parsedAmount?.normalizedQuantity != null) {
      const itemCount =
        !Number.isNaN(receiptQuantity) && receiptQuantity > 1
          ? receiptQuantity
          : 1;

      quantity = Number(parsedAmount.normalizedQuantity) * itemCount;
      unit = parsedAmount.normalizedUnit || baseUnit;
    } else if (!Number.isNaN(receiptQuantity) && receiptQuantity >= 1) {
      quantity = receiptQuantity;
      unit = baseUnit;
    }
  }

  return {
    draftId: String(index),
    originalName,
    name: originalName,
    include: true,
    isEdible: true,
    ingredientName: resolvedIngredientName || "",
    suggestedIngredientName: resolvedIngredientName || "",
    ingredientId,
    quantity,
    unit,
    reason: null,
    status: ingredientId && quantity != null && unit ? "ready" : "needs_review",
    receiptQuantity: item?.quantity ?? null,
  };
}

router.post("/scan", async (req, res) => {
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
      },
    );

    const items = response.data?.data?.json?.items || [];
    const draftItems = await Promise.all(
      items.map((item, index) => buildReceiptDraftItem(item, index)),
    );

    const readyCount = draftItems.filter(
      (item) => item.status === "ready",
    ).length;
    const skippedCount = draftItems.filter(
      (item) => item.status === "skipped",
    ).length;
    const reviewCount = draftItems.filter(
      (item) => item.status === "needs_review",
    ).length;

    res.json({
      message: "Черновик чека подготовлен",
      totalItems: draftItems.length,
      readyCount,
      skippedCount,
      reviewCount,
      items: draftItems,
      rawResponse: response.data,
    });
  } catch (error) {
    console.error(
      "Ошибка получения данных чека:",
      error.response?.data || error.message,
    );

    res.status(500).json({
      error: "Ошибка получения данных чека",
    });
  }
});

router.post("/confirm", async (req, res) => {
  const userId = 1;
  const incomingItems = Array.isArray(req.body?.items) ? req.body.items : [];

  if (!incomingItems.length) {
    return res.status(400).json({
      error: "Нет товаров для подтверждения",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const addedItems = [];
    const skippedItems = [];

    for (const item of incomingItems) {
      const include = item?.include !== false;
      const isEdible = item?.isEdible !== false;

      if (!include) {
        skippedItems.push({
          name: item?.name || item?.originalName || null,
          reason: "excluded_by_user",
        });
        continue;
      }

      if (!isEdible) {
        skippedItems.push({
          name: item?.name || item?.originalName || null,
          reason: "marked_as_non_food",
        });
        continue;
      }

      const name = String(item?.name || "").trim();
      const quantity = normalizeEditableQuantity(item?.quantity);
      const unit = normalizeEditableUnit(item?.unit);
      const ingredientNameInput = String(item?.ingredientName || "").trim();

      if (!name) {
        skippedItems.push({
          name: item?.originalName || null,
          reason: "empty_name",
        });
        continue;
      }

      if (quantity == null || !unit) {
        skippedItems.push({
          name,
          reason: "invalid_quantity_or_unit",
        });
        continue;
      }

      let ingredientId = null;
      let ingredientName = ingredientNameInput;
      let baseUnit = null;
      let normalizedQuantity = null;
      let normalizedUnit = null;

      if (ingredientNameInput) {
        const ingredientResult = await client.query(
          `
          SELECT id, name, base_unit
          FROM ingredients
          WHERE LOWER(name) = LOWER($1)
          LIMIT 1
          `,
          [ingredientNameInput],
        );

        if (ingredientResult.rows.length > 0) {
          ingredientId = ingredientResult.rows[0].id;
          ingredientName = ingredientResult.rows[0].name;
          baseUnit = ingredientResult.rows[0].base_unit;
        }
      }

      if (ingredientId && baseUnit === unit) {
        normalizedQuantity = quantity;
        normalizedUnit = unit;
      }

      const insertResult = await client.query(
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
          name,
          quantity,
          unit,
          ingredientId,
          normalizedQuantity,
          normalizedUnit,
        ],
      );

      addedItems.push({
        ...insertResult.rows[0],
        ingredientName: ingredientName || null,
      });
    }

    await client.query("COMMIT");

    res.json({
      message: "Сканирование подтверждено",
      addedCount: addedItems.length,
      skippedCount: skippedItems.length,
      addedItems,
      skippedItems,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Ошибка подтверждения сканирования:", error);

    res.status(500).json({
      error: "Не удалось подтвердить сканирование",
    });
  } finally {
    client.release();
  }
});

module.exports = router;
