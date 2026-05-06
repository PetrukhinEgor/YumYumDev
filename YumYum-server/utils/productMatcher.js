// Product recognition rules live in SQLite table product_match_keywords.
// This file is only the matching engine that applies those rules.

const { all, get, run } = require("../db");

function cleanName(value = "") {
  return String(value).toLowerCase().trim();
}

function normalizeKeyword(value = "") {
  return cleanName(value).replace(/\s+/g, " ");
}

function getKeywordRules() {
  return all(
    `
    SELECT
      pmk.id,
      pmk.keyword,
      pmk.ingredient_id,
      pmk.is_food,
      pmk.priority,
      pmk.source,
      i.name AS ingredient_name,
      i.base_unit
    FROM product_match_keywords pmk
    LEFT JOIN ingredients i
      ON i.id = pmk.ingredient_id
    ORDER BY
      pmk.priority ASC,
      LENGTH(pmk.keyword) DESC,
      pmk.id ASC
    `
  );
}

function findMatchingRule(productName) {
  const name = cleanName(productName);

  if (!name) return null;

  const rules = getKeywordRules();

  return (
    rules.find((rule) => {
      const keyword = normalizeKeyword(rule.keyword);
      return keyword && name.includes(keyword);
    }) || null
  );
}

function matchProduct(productName) {
  const rule = findMatchingRule(productName);

  if (!rule) {
    return {
      matched: false,
      isFood: false,
      ingredientName: null,
      ingredientId: null,
      baseUnit: null,
      keyword: null,
      source: null,
    };
  }

  const isFood = Number(rule.is_food) === 1;

  return {
    matched: true,
    isFood,
    ingredientName: isFood ? rule.ingredient_name : null,
    ingredientId: isFood ? rule.ingredient_id : null,
    baseUnit: isFood ? rule.base_unit : null,
    keyword: rule.keyword,
    source: rule.source,
  };
}

function isNonFoodProduct(productName) {
  const result = matchProduct(productName);
  return result.matched && !result.isFood;
}

function isLikelyFoodProduct(productName) {
  const result = matchProduct(productName);
  return result.matched && result.isFood;
}

function matchIngredient(productName) {
  const result = matchProduct(productName);
  return result.isFood ? result.ingredientName : null;
}

function resolveIngredientByName(ingredientName) {
  const trimmedName = String(ingredientName || "").trim();

  if (!trimmedName) return null;

  return get(
    `
    SELECT id, name, base_unit
    FROM ingredients
    WHERE LOWER(name) = LOWER(?)
    LIMIT 1
    `,
    [trimmedName]
  );
}

function createKeywordRule({ keyword, ingredientName, isFood = true, priority = 20 }) {
  const normalizedKeyword = normalizeKeyword(keyword);

  if (!normalizedKeyword) {
    throw new Error("Ключевое слово не может быть пустым");
  }

  const foodFlag = isFood ? 1 : 0;
  let ingredientId = null;

  if (foodFlag) {
    const ingredient = resolveIngredientByName(ingredientName);

    if (!ingredient) {
      throw new Error(`Ингредиент "${ingredientName}" не найден`);
    }

    ingredientId = ingredient.id;
  }

  run(
    `
    INSERT INTO product_match_keywords (
      keyword,
      ingredient_id,
      is_food,
      priority,
      source
    )
    VALUES (?, ?, ?, ?, 'user')
    ON CONFLICT(keyword)
    DO UPDATE SET
      ingredient_id = excluded.ingredient_id,
      is_food = excluded.is_food,
      priority = excluded.priority,
      source = 'user'
    `,
    [normalizedKeyword, ingredientId, foodFlag, priority]
  );

  return get(
    `
    SELECT
      pmk.id,
      pmk.keyword,
      pmk.ingredient_id,
      pmk.is_food,
      pmk.priority,
      pmk.source,
      i.name AS ingredient_name
    FROM product_match_keywords pmk
    LEFT JOIN ingredients i
      ON i.id = pmk.ingredient_id
    WHERE pmk.keyword = ?
    LIMIT 1
    `,
    [normalizedKeyword]
  );
}

module.exports = {
  matchProduct,
  matchIngredient,
  isNonFoodProduct,
  isLikelyFoodProduct,
  createKeywordRule,
};
