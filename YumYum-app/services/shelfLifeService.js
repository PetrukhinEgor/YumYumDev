import { getFirst } from "../database/db";

function toDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function todayDateOnly() {
  return toDateOnly(new Date());
}

export function addDays(dateOnly, days) {
  const date = new Date(`${dateOnly}T00:00:00`);
  date.setDate(date.getDate() + Number(days));

  return toDateOnly(date);
}

export function normalizeDateInput(value) {
  if (value == null || value === "") return null;

  const normalized = String(value).trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;

  const date = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : toDateOnly(date);
}

export async function calculateDefaultExpiresAt(ingredientId) {
  if (!ingredientId) return null;

  const rule = await getFirst(
    `
    SELECT default_days
    FROM shelf_life_rules
    WHERE ingredient_id = ?
    LIMIT 1
    `,
    [ingredientId]
  );

  if (!rule) return null;

  return addDays(todayDateOnly(), rule.default_days);
}

export function getExpirationStatus(expiresAt) {
  const normalized = normalizeDateInput(expiresAt);

  if (!normalized) {
    return {
      days_until_expiration: null,
      expiration_status: "unknown",
    };
  }

  const today = new Date(`${todayDateOnly()}T00:00:00`);
  const expires = new Date(`${normalized}T00:00:00`);
  const daysUntilExpiration = Math.ceil(
    (expires - today) / (24 * 60 * 60 * 1000)
  );

  let expirationStatus = "fresh";

  if (daysUntilExpiration < 0) {
    expirationStatus = "expired";
  } else if (daysUntilExpiration === 0) {
    expirationStatus = "today";
  } else if (daysUntilExpiration <= 2) {
    expirationStatus = "soon";
  }

  return {
    days_until_expiration: daysUntilExpiration,
    expiration_status: expirationStatus,
  };
}
