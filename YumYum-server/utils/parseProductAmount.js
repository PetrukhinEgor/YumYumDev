// YumYum-server/utils/parseProductAmount.js

function normalizeNumber(rawValue) {
  if (!rawValue) return null;

  const normalized = String(rawValue).replace(",", ".").trim();
  const parsed = Number(normalized);

  if (Number.isNaN(parsed)) return null;
  return parsed;
}

function createResult(quantity, unit) {
  return {
    normalizedQuantity: quantity,
    normalizedUnit: unit,
  };
}

function extractByRegex(name, regex) {
  const match = name.match(regex);
  if (!match) return null;

  return normalizeNumber(match[1]);
}

function parsePieces(name) {
  const patterns = [
    /(\d+(?:[.,]\d+)?)\s*шт/i,
    /(\d+(?:[.,]\d+)?)\s*шт\./i,
    /(\d+(?:[.,]\d+)?)\s*pcs/i,
    /(\d+(?:[.,]\d+)?)\s*яиц/i,
  ];

  for (const pattern of patterns) {
    const value = extractByRegex(name, pattern);
    if (value !== null) {
      return createResult(value, "pcs");
    }
  }

  return null;
}

function parseMilliliters(name) {
  const mlPatterns = [
    /(\d+(?:[.,]\d+)?)\s*мл/i,
    /(\d+(?:[.,]\d+)?)\s*ml/i,
  ];

  for (const pattern of mlPatterns) {
    const value = extractByRegex(name, pattern);
    if (value !== null) {
      return createResult(value, "ml");
    }
  }

  const literPatterns = [
    /(\d+(?:[.,]\d+)?)\s*л\b/i,
    /(\d+(?:[.,]\d+)?)\s*л\./i,
    /(\d+(?:[.,]\d+)?)\s*l\b/i,
  ];

  for (const pattern of literPatterns) {
    const value = extractByRegex(name, pattern);
    if (value !== null) {
      return createResult(value * 1000, "ml");
    }
  }

  return null;
}

function parseGrams(name) {
  const kgPatterns = [
    /(\d+(?:[.,]\d+)?)\s*кг/i,
    /(\d+(?:[.,]\d+)?)\s*kg/i,
  ];

  for (const pattern of kgPatterns) {
    const value = extractByRegex(name, pattern);
    if (value !== null) {
      return createResult(value * 1000, "g");
    }
  }

  const rangeGramPatterns = [
    /(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)\s*г(?:р)?/i,
    /(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)\s*g\b/i,
  ];

  for (const pattern of rangeGramPatterns) {
    const match = name.match(pattern);
    if (match) {
      const firstValue = normalizeNumber(match[1]);
      if (firstValue !== null) {
        return createResult(firstValue, "g");
      }
    }
  }

  const gramPatterns = [
    /(\d+(?:[.,]\d+)?)\s*г(?:р)?/i,
    /(\d+(?:[.,]\d+)?)\s*g\b/i,
  ];

  for (const pattern of gramPatterns) {
    const value = extractByRegex(name, pattern);
    if (value !== null) {
      return createResult(value, "g");
    }
  }

  return null;
}

function parsePackLikePieces(name) {
  const patterns = [
    /(\d+(?:[.,]\d+)?)\s*уп\b/i,
    /(\d+(?:[.,]\d+)?)\s*уп\./i,
    /(\d+(?:[.,]\d+)?)\s*упаков/i,
    /(\d+(?:[.,]\d+)?)\s*пач/i,
    /(\d+(?:[.,]\d+)?)\s*бут/i,
    /(\d+(?:[.,]\d+)?)\s*бан/i,
  ];

  for (const pattern of patterns) {
    const value = extractByRegex(name, pattern);
    if (value !== null) {
      return createResult(value, "pcs");
    }
  }

  return null;
}

function parseProductAmount(productName, baseUnit, ingredientName = null) {
  if (!productName || !baseUnit) {
    return createResult(null, baseUnit || null);
  }

  const name = productName.toLowerCase();
  const ingredient = ingredientName ? ingredientName.toLowerCase() : "";

  if (baseUnit === "pcs") {
    const pcsResult = parsePieces(name);
    if (pcsResult) return pcsResult;

    const packLikeResult = parsePackLikePieces(name);
    if (packLikeResult) return packLikePieces;

    return createResult(1, "pcs");
  }

  if (baseUnit === "ml") {
    const mlResult = parseMilliliters(name);
    if (mlResult) return mlResult;

    if (ingredient === "молоко" || ingredient === "кефир") {
      const gramsForLiquid = parseGrams(name);
      if (gramsForLiquid) {
        return createResult(gramsForLiquid.normalizedQuantity, "ml");
      }
    }

    return createResult(null, "ml");
  }

  if (baseUnit === "g") {
    const gramsResult = parseGrams(name);
    if (gramsResult) return gramsResult;

    return createResult(null, "g");
  }

  return createResult(null, baseUnit);
}

module.exports = parseProductAmount;