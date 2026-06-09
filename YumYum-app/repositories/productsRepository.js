import { getAll, getFirst, initializeDatabase, run } from "../database/db";
import {
  calculateDefaultExpiresAt,
  getExpirationStatus,
  normalizeDateInput,
} from "../services/shelfLifeService";
import {
  matchProduct,
  resolveIngredientByName,
} from "../services/productMatcherService";

const USER_ID = 1;
const ALLOWED_UNITS = ["g", "ml", "pcs"];

function formatAmount(quantity, unit) {
  if (quantity == null || !unit) return null;

  const numeric = Number(quantity);
  if (Number.isNaN(numeric)) return null;

  const value = Number.isInteger(numeric) ? numeric : Number(numeric.toFixed(2));
  return `${value} ${unit}`;
}

function withDisplayData(product) {
  if (!product) return product;

  return {
    ...product,
    ...getExpirationStatus(product.expires_at),
    display_amount: formatAmount(product.quantity, product.unit),
  };
}

async function resolveIngredientData(productName) {
  const match = await matchProduct(productName);

  if (!match.isFood || !match.ingredientId) {
    return {
      ingredientName: null,
      ingredientId: null,
      baseUnit: null,
    };
  }

  return {
    ingredientName: match.ingredientName,
    ingredientId: match.ingredientId,
    baseUnit: match.baseUnit,
  };
}

function buildNormalizedData(quantity, unit, baseUnit) {
  const parsedQuantity = Number(quantity);
  const normalizedUnit = String(unit || "").trim().toLowerCase();

  if (
    Number.isNaN(parsedQuantity) ||
    parsedQuantity <= 0 ||
    !normalizedUnit ||
    !baseUnit ||
    normalizedUnit !== baseUnit
  ) {
    return {
      normalizedQuantity: null,
      normalizedUnit: null,
    };
  }

  return {
    normalizedQuantity: parsedQuantity,
    normalizedUnit,
  };
}

export async function listProducts() {
  await initializeDatabase();

  const rows = await getAll(
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

  return rows.map(withDisplayData);
}

export async function addProduct({ name, quantity, unit, expiresAt }) {
  await initializeDatabase();

  const trimmedName = String(name || "").trim();
  const parsedQuantity = Number(quantity);
  const normalizedUnit = String(unit || "").trim().toLowerCase();

  if (!trimmedName) throw new Error("Название продукта обязательно");
  if (!parsedQuantity || parsedQuantity <= 0) {
    throw new Error("Количество должно быть больше нуля");
  }
  if (!ALLOWED_UNITS.includes(normalizedUnit)) {
    throw new Error("Допустимые единицы: g, ml, pcs");
  }

  const { ingredientId, baseUnit } = await resolveIngredientData(trimmedName);
  const { normalizedQuantity, normalizedUnit: productNormalizedUnit } =
    buildNormalizedData(parsedQuantity, normalizedUnit, baseUnit);
  const requestedExpiresAt = normalizeDateInput(expiresAt);
  const nextExpiresAt =
    requestedExpiresAt || (await calculateDefaultExpiresAt(ingredientId));

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
      trimmedName,
      parsedQuantity,
      normalizedUnit,
      nextExpiresAt,
      ingredientId,
      normalizedQuantity,
      productNormalizedUnit,
    ]
  );

  return findProductByName(trimmedName);
}

export async function updateProduct(id, { name, quantity, unit, expiresAt }) {
  await initializeDatabase();

  const existing = await getFirst(
    "SELECT * FROM products WHERE id = ? AND user_id = ? LIMIT 1",
    [id, USER_ID]
  );

  if (!existing) throw new Error("Продукт не найден");

  const nextName =
    name !== undefined ? String(name).trim() : String(existing.name || "").trim();
  const nextQuantity =
    quantity !== undefined ? Number(quantity) : Number(existing.quantity);
  const nextUnit =
    unit !== undefined
      ? String(unit).trim().toLowerCase()
      : String(existing.unit || "").trim().toLowerCase();

  if (!nextName) throw new Error("Название не может быть пустым");
  if (!nextQuantity || nextQuantity <= 0) {
    throw new Error("Количество должно быть больше нуля");
  }
  if (!ALLOWED_UNITS.includes(nextUnit)) {
    throw new Error("Допустимые единицы: g, ml, pcs");
  }

  const { ingredientId, baseUnit } = await resolveIngredientData(nextName);
  const { normalizedQuantity, normalizedUnit } = buildNormalizedData(
    nextQuantity,
    nextUnit,
    baseUnit
  );
  const nextExpiresAt =
    expiresAt !== undefined
      ? normalizeDateInput(expiresAt)
      : existing.expires_at || (await calculateDefaultExpiresAt(ingredientId));

  await run(
    `
    UPDATE products
    SET
      name = ?,
      quantity = ?,
      unit = ?,
      expires_at = ?,
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
      nextExpiresAt,
      ingredientId,
      normalizedQuantity,
      normalizedUnit,
      id,
      USER_ID,
    ]
  );

  return findProductByName(nextName);
}

export async function deleteProduct(id) {
  await initializeDatabase();

  await run("DELETE FROM products WHERE id = ? AND user_id = ?", [id, USER_ID]);
}

export async function findProductByName(name) {
  const product = await getFirst(
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
    [USER_ID, name]
  );

  return withDisplayData(product);
}

export async function resolveEditableIngredient(ingredientName) {
  await initializeDatabase();
  return resolveIngredientByName(ingredientName);
}
