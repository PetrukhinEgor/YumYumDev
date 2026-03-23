// YumYum-server/utils/parseProductAmount.js

function normalizeNumber(rawValue) {
  if (!rawValue) return null;

  const normalized = rawValue.replace(",", ".").trim();
  const parsed = Number(normalized);

  if (Number.isNaN(parsed)) return null;

  return parsed;
}

function parseProductAmount(productName, baseUnit, ingredientName = null) {
  if (!productName || !baseUnit) {
    return {
      normalizedQuantity: null,
      normalizedUnit: baseUnit || null,
    };
  }

  const name = productName.toLowerCase();
  const ingredient = ingredientName ? ingredientName.toLowerCase() : "";

  // -----------------------------
  // ШТУКИ
  // -----------------------------
  if (baseUnit === "pcs") {
    const pcsMatch = name.match(/(\d+(?:[.,]\d+)?)\s*шт/i);

    if (pcsMatch) {
      const value = normalizeNumber(pcsMatch[1]);

      return {
        normalizedQuantity: value,
        normalizedUnit: "pcs",
      };
    }

    // если количество не найдено явно, считаем 1 штуку
    return {
      normalizedQuantity: 1,
      normalizedUnit: "pcs",
    };
  }

  // -----------------------------
  // МИЛЛИЛИТРЫ
  // -----------------------------
  if (baseUnit === "ml") {
    const mlMatch = name.match(/(\d+(?:[.,]\d+)?)\s*мл/i);
    if (mlMatch) {
      const ml = normalizeNumber(mlMatch[1]);

      return {
        normalizedQuantity: ml,
        normalizedUnit: "ml",
      };
    }

    const literMatch = name.match(/(\d+(?:[.,]\d+)?)\s*л/i);
    if (literMatch) {
      const liters = normalizeNumber(literMatch[1]);

      if (liters !== null) {
        return {
          normalizedQuantity: liters * 1000,
          normalizedUnit: "ml",
        };
      }
    }

    // Специальное правило для молока и кефира:
    // если в названии указаны граммы, считаем для диплома 1г ≈ 1мл
    // Пример: "Молоко ... 825г" -> 825 мл
    if (ingredient === "молоко" || ingredient === "кефир") {
      const gramMatchForLiquid = name.match(/(\d+(?:[.,]\d+)?)\s*г(?:р)?/i);

      if (gramMatchForLiquid) {
        const grams = normalizeNumber(gramMatchForLiquid[1]);

        return {
          normalizedQuantity: grams,
          normalizedUnit: "ml",
        };
      }
    }

    return {
      normalizedQuantity: null,
      normalizedUnit: "ml",
    };
  }

  // -----------------------------
  // ГРАММЫ
  // -----------------------------
  if (baseUnit === "g") {
    const kgMatch = name.match(/(\d+(?:[.,]\d+)?)\s*кг/i);
    if (kgMatch) {
      const kg = normalizeNumber(kgMatch[1]);

      if (kg !== null) {
        return {
          normalizedQuantity: kg * 1000,
          normalizedUnit: "g",
        };
      }
    }

    const rangeGramMatch = name.match(
      /(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)\s*г(?:р)?/i
    );
    if (rangeGramMatch) {
      const grams = normalizeNumber(rangeGramMatch[1]);

      return {
        normalizedQuantity: grams,
        normalizedUnit: "g",
      };
    }

    const gramMatch = name.match(/(\d+(?:[.,]\d+)?)\s*г(?:р)?/i);
    if (gramMatch) {
      const grams = normalizeNumber(gramMatch[1]);

      return {
        normalizedQuantity: grams,
        normalizedUnit: "g",
      };
    }

    return {
      normalizedQuantity: null,
      normalizedUnit: "g",
    };
  }

  return {
    normalizedQuantity: null,
    normalizedUnit: baseUnit,
  };
}

module.exports = parseProductAmount;