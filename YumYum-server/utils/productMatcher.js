// YumYum-server/utils/productMatcher.js

function cleanName(productName = "") {
  return productName.toLowerCase().trim();
}

function containsAny(text, words = []) {
  return words.some((word) => text.includes(word));
}

function isNonFoodProduct(productName) {
  const name = cleanName(productName);

  const nonFoodKeywords = [
    "пакет",
    "майка",
    "фасовоч",
    "мешок",
    "однораз",
    "салфет",
    "полотенц",
    "туалетн",
    "бумага",

    "сигарет",
    "parliament",
    "marlboro",
    "winston",
    "chesterfield",
    "табак",
    "стик",
    "iqos",

    "мыло",
    "шампун",
    "бальзам",
    "порошок",
    "ополаскив",
    "кондиционер",
    "чистящ",
    "моющ",
    "доместос",
    "fairy",
    "sorti",
    "aos",
    "зубная паста",
    "щетка",
    "дезодорант",
    "проклад",
    "тампон",

    "губка",
    "тряпк",
    "перчатк",
    "батарейк",
    "лампа",
    "фольга",
    "пленка",
    "контейнер",

    "whiskas",
    "kitekat",
    "felix",
    "pedigree",
    "корм для кош",
    "корм для собак",
    "наполнитель",

    "зажигал",
    "спички",
  ];

  return containsAny(name, nonFoodKeywords);
}

function isLikelyFoodProduct(productName) {
  const name = cleanName(productName);

  const foodKeywords = [
    "молок",
    "кефир",
    "сметан",
    "творог",
    "йогурт",
    "сыр",
    "масло",

    "яйц",
    "соль",
    "сахар",
    "мука",
    "рис",
    "греч",
    "макарон",
    "лапша",
    "пельмен",
    "вареник",
    "майонез",
    "фасол",

    "картоф",
    "морков",
    "лук",
    "чеснок",
    "свекл",
    "капуст",
    "огур",
    "томат",
    "помидор",

    "куриц",
    "фарш",
    "мясо",
    "рыба",

    "виноград",
    "киви",
    "клюкв",

    "кекс",
    "печенье",
    "чипс",
  ];

  return containsAny(name, foodKeywords);
}

function matchIngredient(productName) {
  if (!productName) return null;

  const name = cleanName(productName);

  /*
  ========================================
  🔥 1. ПРИОРИТЕТНЫЕ ПРОВЕРКИ (важно!)
  ========================================
  */

  // ❗ чипсы раньше соли
  if (name.includes("чипс")) return "Чипсы";

  // ❗ фарш раньше мяса
  if (name.includes("фарш")) return "Фарш";

  /*
  ========================================
  🥛 МОЛОЧКА
  ========================================
  */

  if (name.includes("молок")) return "Молоко";
  if (name.includes("кефир")) return "Кефир";
  if (name.includes("сметан")) return "Сметана";
  if (name.includes("творог")) return "Творог";
  if (name.includes("сыр")) return "Сыр";
  if (name.includes("майонез")) return "Майонез";
  if (name.includes("масло")) return "Масло";

  /*
  ========================================
  🥚 БАЗОВЫЕ
  ========================================
  */

  if (name.includes("яйц")) return "Яйца";
  if (name.includes("соль")) return "Соль";
  if (name.includes("сахар")) return "Сахар";
  if (name.includes("мука")) return "Мука";
  if (name.includes("рис")) return "Рис";

  /*
  ========================================
  🌾 КРУПЫ (🔥 исправлено)
  ========================================
  */

  if (name.includes("греч")) return "Гречка";

  if (
    name.includes("макарон") ||
    name.includes("лапша")
  ) {
    return "Макароны";
  }

  if (name.includes("пельмен")) return "Пельмени";

  if (
    name.includes("фасоль") ||
    name.includes("фас.") ||
    name.includes("фас ")
  ) {
    return "Фасоль";
  }

  /*
  ========================================
  🥕 ОВОЩИ
  ========================================
  */

  if (name.includes("капуст")) return "Капуста";
  if (name.includes("картоф")) return "Картофель";
  if (name.includes("морков")) return "Морковь";

  if (name.includes("лук")) return "Лук";
  if (name.includes("чеснок")) return "Чеснок";
  if (name.includes("свекл")) return "Свекла";
  if (name.includes("огур")) return "Огурец";

  if (
    name.includes("томат") ||
    name.includes("помидор")
  ) {
    return "Помидор";
  }

  /*
  ========================================
  🍗 МЯСО
  ========================================
  */

  if (name.includes("куриц") || name.includes("цыпл")) {
    return "Курица";
  }

  if (name.includes("свинин")) return "Свинина";
  if (name.includes("говядин")) return "Говядина";

  /*
  ========================================
  🐟 РЫБА
  ========================================
  */

  if (
    name.includes("рыба") ||
    name.includes("вобл") ||
    name.includes("лосос") ||
    name.includes("тунец")
  ) {
    return "Рыба";
  }

  /*
  ========================================
  🍞 ХЛЕБ
  ========================================
  */

  if (name.includes("лаваш")) return "Лаваш";
  if (name.includes("багет")) return "Багет";
  if (name.includes("хлеб")) return "Хлеб";

  /*
  ========================================
  🍭 ПРОЧЕЕ
  ========================================
  */

  if (name.includes("печенье")) return "Печенье";
  if (name.includes("кекс")) return "Кекс";
  if (name.includes("леден")) return "Леденцы";

  if (name.includes("сок")) return "Сок";
  if (name.includes("нектар")) return "Нектар";

  return null;
}

module.exports = {
  matchIngredient,
  isNonFoodProduct,
  isLikelyFoodProduct,
};