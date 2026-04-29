const { get } = require("../db");

function toDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function todayDateOnly() {
  return toDateOnly(new Date());
}

function addDays(dateOnly, days) {
  const date = new Date(`${dateOnly}T00:00:00`);
  date.setDate(date.getDate() + Number(days));

  return toDateOnly(date);
}

function normalizeDateInput(value) {
  if (value == null || value === "") return null;

  const normalized = String(value).trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;

  const date = new Date(`${normalized}T00:00:00`);

  if (Number.isNaN(date.getTime())) return null;

  return toDateOnly(date);
}

function getShelfLifeRuleByIngredientId(ingredientId) {
  if (!ingredientId) return null;

  return get(
    `
    SELECT
      slr.id,
      slr.ingredient_id,
      slr.default_days,
      slr.storage_type,
      slr.note
    FROM shelf_life_rules slr
    WHERE slr.ingredient_id = ?
    LIMIT 1
    `,
    [ingredientId]
  );
}

function calculateDefaultExpiresAt(ingredientId, purchaseDate = todayDateOnly()) {
  const rule = getShelfLifeRuleByIngredientId(ingredientId);

  if (!rule) return null;

  return addDays(purchaseDate, rule.default_days);
}

function getExpirationStatus(expiresAt) {
  const normalized = normalizeDateInput(expiresAt);

  if (!normalized) {
    return {
      daysUntilExpiration: null,
      expirationStatus: "unknown",
    };
  }

  const today = new Date(`${todayDateOnly()}T00:00:00`);
  const expires = new Date(`${normalized}T00:00:00`);
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUntilExpiration = Math.ceil((expires - today) / msPerDay);

  let expirationStatus = "fresh";

  if (daysUntilExpiration < 0) {
    expirationStatus = "expired";
  } else if (daysUntilExpiration === 0) {
    expirationStatus = "today";
  } else if (daysUntilExpiration <= 2) {
    expirationStatus = "soon";
  }

  return {
    daysUntilExpiration,
    expirationStatus,
  };
}

function chooseEarlierDate(firstDate, secondDate) {
  const first = normalizeDateInput(firstDate);
  const second = normalizeDateInput(secondDate);

  if (!first) return second;
  if (!second) return first;

  return first <= second ? first : second;
}

module.exports = {
  todayDateOnly,
  normalizeDateInput,
  calculateDefaultExpiresAt,
  getExpirationStatus,
  chooseEarlierDate,
};
