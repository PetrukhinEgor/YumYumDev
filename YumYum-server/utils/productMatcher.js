// YumYum-server/utils/productMatcher.js

const matchIngredient = (productName) => {
  const name = productName.toLowerCase();

  if (name.includes("яйц"))
    return "Яйца";

  if (name.includes("молок"))
    return "Молоко";

  if (name.includes("морков"))
    return "Морковь";

  if (name.includes("соль"))
    return "Соль";

  return null;
};

module.exports = matchIngredient;