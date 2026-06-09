import { initializeDatabase, run } from "../database/db";
import { parseProductAmount } from "./amountParser";
import {
  createKeywordRule,
  matchProduct,
  resolveIngredientByName,
  suggestKeywordFromName,
} from "./productMatcherService";
import {
  calculateDefaultExpiresAt,
  normalizeDateInput,
} from "./shelfLifeService";

const USER_ID = 1;
const ALLOWED_UNITS = ["g", "ml", "pcs"];

function normalizeEditableQuantity(quantity) {
  if (quantity === "" || quantity == null) return null;

  const parsed = Number(quantity);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

function normalizeEditableUnit(unit) {
  const normalized = String(unit || "").trim().toLowerCase();
  return ALLOWED_UNITS.includes(normalized) ? normalized : null;
}

function buildQuantityData(item, originalName, baseUnit) {
  const receiptQuantity = Number(item?.quantity);
  const parsedAmount = parseProductAmount(originalName, baseUnit);
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
      !Number.isNaN(receiptQuantity) && receiptQuantity > 1 ? receiptQuantity : 1;

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

export async function buildReceiptDraftItems(rawItems) {
  await initializeDatabase();

  const items = Array.isArray(rawItems) ? rawItems : [];
  const draftItems = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const originalName = String(item?.name || "").trim();

    if (!originalName) {
      draftItems.push({
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
        matchedKeyword: null,
        keywordCandidate: "",
      });
      continue;
    }

    const match = await matchProduct(originalName);

    if (match.matched && !match.isFood) {
      draftItems.push({
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
        matchedKeyword: match.keyword,
        keywordCandidate: suggestKeywordFromName(originalName),
      });
      continue;
    }

    if (!match.matched || !match.isFood) {
      draftItems.push({
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
        matchedKeyword: null,
        keywordCandidate: suggestKeywordFromName(originalName),
      });
      continue;
    }

    const quantityData = buildQuantityData(item, originalName, match.baseUnit);
    const expiresAt = await calculateDefaultExpiresAt(match.ingredientId);

    draftItems.push({
      draftId: String(index),
      originalName,
      name: originalName,
      include: true,
      isEdible: true,
      ingredientName: match.ingredientName || "",
      suggestedIngredientName: match.ingredientName || "",
      ingredientId: match.ingredientId,
      quantity: quantityData.quantity,
      unit: quantityData.unit,
      expiresAt,
      reason: null,
      matchedKeyword: match.keyword,
      keywordCandidate: match.keyword || suggestKeywordFromName(originalName),
      status:
        match.ingredientId && quantityData.quantity != null && quantityData.unit
          ? "ready"
          : "needs_review",
      receiptQuantity: item?.quantity ?? null,
    });
  }

  return draftItems;
}

export async function confirmReceiptItems(items) {
  await initializeDatabase();

  const incomingItems = Array.isArray(items) ? items : [];
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

    const result = await saveConfirmedItem(item);

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
    addedCount: addedItems.length,
    skippedCount: skippedItems.length,
  };
}

async function saveConfirmedItem(item) {
  const name = String(item?.name || "").trim();
  const quantity = normalizeEditableQuantity(item?.quantity);
  const unit = normalizeEditableUnit(item?.unit);
  const ingredientNameInput = String(item?.ingredientName || "").trim();
  const rememberKeywordRule = item?.rememberKeywordRule === true;
  const keywordInput = String(item?.keyword || item?.keywordCandidate || "").trim();

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

  const ingredient = await resolveIngredientByName(ingredientNameInput);
  const ingredientId = ingredient?.id || null;
  const baseUnit = ingredient?.base_unit || null;
  const normalizedQuantity = ingredientId && baseUnit === unit ? quantity : null;
  const normalizedUnit = ingredientId && baseUnit === unit ? unit : null;
  const requestedExpiresAt = normalizeDateInput(item?.expiresAt ?? item?.expires_at);
  const expiresAt =
    requestedExpiresAt || (await calculateDefaultExpiresAt(ingredientId));
  let savedKeywordRule = null;

  if (rememberKeywordRule && keywordInput && ingredientId) {
    savedKeywordRule = await createKeywordRule({
      keyword: keywordInput,
      ingredientName: ingredient.name,
      isFood: true,
      priority: 15,
    });
  }

  await run(
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

  return {
    saved: true,
    item: {
      name,
      quantity,
      unit,
      expires_at: expiresAt,
      ingredient_id: ingredientId,
      normalized_quantity: normalizedQuantity,
      normalized_unit: normalizedUnit,
      ingredientName: ingredient?.name || null,
      savedKeywordRule,
    },
  };
}
