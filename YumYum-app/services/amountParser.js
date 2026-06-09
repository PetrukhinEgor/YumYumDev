export function parseProductAmount(productName, baseUnit) {
  const name = String(productName || "").toLowerCase().replace(",", ".");

  const gramMatch = name.match(/(\d+(?:\.\d+)?)\s*(?:г|гр|g)\b/);
  if (gramMatch && baseUnit === "g") {
    return {
      normalizedQuantity: Number(gramMatch[1]),
      normalizedUnit: "g",
    };
  }

  const kgMatch = name.match(/(\d+(?:\.\d+)?)\s*(?:кг|kg)\b/);
  if (kgMatch && baseUnit === "g") {
    return {
      normalizedQuantity: Number(kgMatch[1]) * 1000,
      normalizedUnit: "g",
    };
  }

  const mlMatch = name.match(/(\d+(?:\.\d+)?)\s*(?:мл|ml)\b/);
  if (mlMatch && baseUnit === "ml") {
    return {
      normalizedQuantity: Number(mlMatch[1]),
      normalizedUnit: "ml",
    };
  }

  const literMatch = name.match(/(\d+(?:\.\d+)?)\s*(?:л|l)\b/);
  if (literMatch && baseUnit === "ml") {
    return {
      normalizedQuantity: Number(literMatch[1]) * 1000,
      normalizedUnit: "ml",
    };
  }

  return null;
}
