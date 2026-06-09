import { getAll, getFirst, run } from "../database/db";

function cleanName(value = "") {
  return String(value).toLowerCase().trim();
}

function normalizeKeyword(value = "") {
  return cleanName(value).replace(/\s+/g, " ");
}

export async function matchProduct(productName) {
  const name = cleanName(productName);

  if (!name) {
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

  const rules = await getAll(
    `
    SELECT
      pmk.keyword,
      pmk.ingredient_id,
      pmk.is_food,
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

  const rule = rules.find((item) => {
    const keyword = normalizeKeyword(item.keyword);
    return keyword && name.includes(keyword);
  });

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

export async function resolveIngredientByName(ingredientName) {
  const trimmedName = String(ingredientName || "").trim();

  if (!trimmedName) return null;

  return getFirst(
    `
    SELECT id, name, base_unit
    FROM ingredients
    WHERE LOWER(name) = LOWER(?)
    LIMIT 1
    `,
    [trimmedName]
  );
}

export async function createKeywordRule({
  keyword,
  ingredientName,
  isFood = true,
  priority = 15,
}) {
  const normalizedKeyword = normalizeKeyword(keyword);

  if (!normalizedKeyword) return null;

  let ingredientId = null;
  const foodFlag = isFood ? 1 : 0;

  if (foodFlag) {
    const ingredient = await resolveIngredientByName(ingredientName);

    if (!ingredient) return null;

    ingredientId = ingredient.id;
  }

  await run(
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

  return getFirst(
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

export function suggestKeywordFromName(productName) {
  const words = String(productName || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.-]/gu, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 4 && !/^\d+$/.test(word));

  return words[0] || "";
}
