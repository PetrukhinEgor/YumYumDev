const express = require("express");
const axios = require("axios");
const { get, run, transaction } = require("../db");
const {
  matchIngredient,
  isNonFoodProduct,
  isLikelyFoodProduct,
} = require("../utils/productMatcher");
const parseProductAmount = require("../utils/parseProductAmount");
const {
  calculateDefaultExpiresAt,
  normalizeDateInput,
} = require("../utils/shelfLife");

const router = express.Router();

const ALLOWED_UNITS = ["g", "ml", "pcs"];
const USER_ID = 1;

function resolveIngredientByName(ingredientName) {
  const trimmedName = String(ingredientName || "").trim();

  if (!trimmedName) {
    return {
      ingredientId: null,
      ingredientName: "",
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
    [trimmedName]
  );

  if (!ingredient) {
    return {
      ingredientId: null,
      ingredientName: trimmedName,
      baseUnit: null,
    };
  }

  return {
    ingredientId: ingredient.id,
    ingredientName: ingredient.name,
    baseUnit: ingredient.base_unit,
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
  const normalized = String(unit || "").trim().toLowerCase();
  return ALLOWED_UNITS.includes(normalized) ? normalized : null;
}

function buildQuantityData(item, originalName, baseUnit, ingredientName) {
  const receiptQuantity = Number(item?.quantity);
  let parsedAmount = null;

  try {
    parsedAmount = parseProductAmount(originalName, baseUnit, ingredientName);
  } catch (error) {
    console.warn("parseProductAmount warning:", error.message);
  }

  const lowerName = originalName.toLowerCase();
  const isWeightedKgItem =
    baseUnit === "g" &&
    !Number.isNaN(receiptQuantity) &&
    receiptQuantity > 0 &&
    (Number(item?.itemsQuantityMeasure) === 11 || lowerName.includes(", кг"));

  if (isWeightedKgItem) {
    return {
      quantity: Math.round(receiptQuantity * 1000),
      unit: "g",
    };
  }

  if (parsedAmount?.normalizedQuantity != null) {
    const itemCount =
      !Number.isNaN(receiptQuantity) && receiptQuantity > 1
        ? receiptQuantity
        : 1;

    return {
      quantity: Number(parsedAmount.normalizedQuantity) * itemCount,
      unit: parsedAmount.normalizedUnit || baseUnit,
    };
  }

  if (!Number.isNaN(receiptQuantity) && receiptQuantity >= 1) {
    return {
      quantity: receiptQuantity,
      unit: baseUnit,
    };
  }

  return {
    quantity: null,
    unit: null,
  };
}

function buildReceiptDraftItem(item, index) {
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
    suggestedIngredientName || isLikelyFoodProduct(originalName)
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
    const ingredientData = resolveIngredientByName(suggestedIngredientName);
    ingredientId = ingredientData.ingredientId;
    baseUnit = ingredientData.baseUnit;
    resolvedIngredientName = ingredientData.ingredientName;
  }

  if (baseUnit) {
    const quantityData = buildQuantityData(
      item,
      originalName,
      baseUnit,
      resolvedIngredientName
    );

    quantity = quantityData.quantity;
    unit = quantityData.unit;
  }

  const expiresAt = ingredientId ? calculateDefaultExpiresAt(ingredientId) : null;

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
    expiresAt,
    reason: null,
    status:
      ingredientId && quantity != null && unit
        ? "ready"
        : "needs_review",
    receiptQuantity: item?.quantity ?? null,
  };
}

function saveConfirmedItem(item) {
  const name = String(item?.name || "").trim();
  const quantity = normalizeEditableQuantity(item?.quantity);
  const unit = normalizeEditableUnit(item?.unit);
  const ingredientNameInput = String(item?.ingredientName || "").trim();

  if (!name) {
    return {
      saved: false,
      reason: "empty_name",
      name: item?.originalName || null,
    };
  }

  if (quantity == null || !unit) {
    return {
      saved: false,
      reason: "invalid_quantity_or_unit",
      name,
    };
  }

  let ingredientId = null;
  let ingredientName = ingredientNameInput;
  let baseUnit = null;
  let normalizedQuantity = null;
  let normalizedUnit = null;

  if (ingredientNameInput) {
    const ingredientData = resolveIngredientByName(ingredientNameInput);
    ingredientId = ingredientData.ingredientId;
    ingredientName = ingredientData.ingredientName || ingredientNameInput;
    baseUnit = ingredientData.baseUnit;
  }

  if (ingredientId && baseUnit === unit) {
    normalizedQuantity = quantity;
    normalizedUnit = unit;
  }

  const requestedExpiresAt = normalizeDateInput(
    item?.expiresAt ?? item?.expires_at
  );
  const defaultExpiresAt = calculateDefaultExpiresAt(ingredientId);
  const expiresAt = requestedExpiresAt || defaultExpiresAt;

  run(
    `
    INSERT INTO products (
      user_id,
      name,
      quantity,
      unit,
      expires_at,
      ingredient_id,
      normalized_quantity,
      normalized_unit
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, name)
    DO UPDATE SET
      quantity = products.quantity + excluded.quantity,
      unit = COALESCE(products.unit, excluded.unit),
      expires_at = CASE
        WHEN products.expires_at IS NULL THEN excluded.expires_at
        WHEN excluded.expires_at IS NULL THEN products.expires_at
        WHEN excluded.expires_at < products.expires_at THEN excluded.expires_at
        ELSE products.expires_at
      END,
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
      name,
      quantity,
      unit,
      expiresAt,
      ingredientId,
      normalizedQuantity,
      normalizedUnit,
    ]
  );

  const product = get(
    `
    SELECT id, name, quantity, unit, expires_at, ingredient_id, normalized_quantity, normalized_unit
    FROM products
    WHERE user_id = ?
      AND name = ?
    LIMIT 1
    `,
    [USER_ID, name]
  );

  return {
    saved: true,
    item: {
      ...product,
      ingredientName: ingredientName || null,
    },
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
      }
    );

    const items = response.data?.data?.json?.items || [];
    const draftItems = items.map((item, index) =>
      buildReceiptDraftItem(item, index)
    );

    const readyCount = draftItems.filter((item) => item.status === "ready").length;
    const skippedCount = draftItems.filter((item) => item.status === "skipped").length;
    const reviewCount = draftItems.filter(
      (item) => item.status === "needs_review"
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
      "Receipt scan error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      error: "Ошибка получения данных чека",
    });
  }
});

router.post("/confirm", (req, res) => {
  const incomingItems = Array.isArray(req.body?.items) ? req.body.items : [];

  if (!incomingItems.length) {
    return res.status(400).json({
      error: "Нет товаров для подтверждения",
    });
  }

  try {
    const confirmTransaction = transaction((items) => {
      const addedItems = [];
      const skippedItems = [];

      for (const item of items) {
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

        const result = saveConfirmedItem(item);

        if (result.saved) {
          addedItems.push(result.item);
        } else {
          skippedItems.push({
            name: result.name,
            reason: result.reason,
          });
        }
      }

      return {
        addedItems,
        skippedItems,
      };
    });

    const { addedItems, skippedItems } = confirmTransaction(incomingItems);

    res.json({
      message: "Сканирование подтверждено",
      addedCount: addedItems.length,
      skippedCount: skippedItems.length,
      addedItems,
      skippedItems,
    });
  } catch (error) {
    console.error("Receipt confirm error:", error);

    res.status(500).json({
      error: "Не удалось подтвердить сканирование",
    });
  }
});

module.exports = router;
