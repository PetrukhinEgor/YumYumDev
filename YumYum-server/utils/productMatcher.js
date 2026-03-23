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
    "черри",
    "зелень",
    "укроп",
    "петруш",
    "рукол",
    "салат",

    "куриц",
    "цыпл",
    "филе кур",
    "свинин",
    "говядин",
    "фарш",
    "мясо",
    "рыба",
    "вобл",
    "лосос",
    "тунец",
    "карпаччо",

    "виноград",
    "киви",
    "яблок",
    "банан",
    "апельсин",
    "клюкв",
    "маракуй",

    "кекс",
    "печенье",
    "шоколад",
    "чипс",
    "леден",
    "завтрак",

    "икра",
    "краб",
    "сок",
    "нектар",
    "лаваш",
    "багет",
    "хлеб",
  ];

  return containsAny(name, foodKeywords);
}

function matchIngredient(productName) {
  if (!productName) return null;

  const name = cleanName(productName);

  // яйца
  if (name.includes("яйц")) return "Яйца";

  // молочка
  if (name.includes("молок")) return "Молоко";
  if (name.includes("кефир")) return "Кефир";
  if (name.includes("сметан")) return "Сметана";
  if (name.includes("творог")) return "Творог";
  if (name.includes("сыр")) return "Сыр";
  if (name.includes("майонез")) return "Майонез";
  if (name.includes("масло")) return "Масло";

  // базовые продукты
  if (name.includes("соль")) return "Соль";
  if (name.includes("сахар")) return "Сахар";
  if (name.includes("мука")) return "Мука";
  if (name.includes("рис")) return "Рис";

  if (name.includes("макарон") || name.includes("лапша")) {
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

  // овощи
  if (name.includes("капуст")) return "Капуста";
  if (name.includes("картоф")) return "Картофель";
  if (name.includes("морков")) return "Морковь";

  if (name.includes("лук зелен")) return "Лук";
  if (name.includes("лук")) return "Лук";

  if (name.includes("чеснок")) return "Чеснок";
  if (name.includes("свекл")) return "Свекла";
  if (name.includes("огур")) return "Огурец";

  if (
    name.includes("томат") ||
    name.includes("помидор") ||
    name.includes("черри")
  ) {
    return "Помидор";
  }

  if (name.includes("укроп")) return "Укроп";
  if (name.includes("рукол")) return "Рукола";
  if (name.includes("петруш")) return "Зелень";
  if (name.includes("зелень")) return "Зелень";
  if (name.includes("салат")) return "Салат";

  // мясо / птица
  if (
    name.includes("куриц") ||
    name.includes("цыпл") ||
    name.includes("филе кур") ||
    name.includes("карпаччо")
  ) {
    return "Курица";
  }

  if (name.includes("свинин") || name.includes("стейк свиной")) {
    return "Свинина";
  }

  if (name.includes("говядин")) {
    return "Говядина";
  }

  // рыба
  if (
    name.includes("вобл") ||
    name.includes("рыба") ||
    name.includes("лосос") ||
    name.includes("тунец")
  ) {
    return "Рыба";
  }

  // фрукты / ягоды
  if (name.includes("виноград")) return "Виноград";
  if (name.includes("киви")) return "Киви";
  if (name.includes("клюкв")) return "Клюква";
  if (name.includes("маракуй")) return "Маракуйя";

  // выпечка / снеки
  if (name.includes("кекс")) return "Кекс";
  if (name.includes("печенье")) return "Печенье";
  if (name.includes("чипс")) return "Чипсы";
  if (name.includes("леден")) return "Леденцы";

  // напитки
  if (name.includes("нектар")) return "Нектар";
  if (name.includes("сок")) return "Сок";

  // хлебное
  if (name.includes("лаваш")) return "Лаваш";
  if (name.includes("багет")) return "Багет";
  if (name.includes("хлеб")) return "Хлеб";

  return null;
}

module.exports = {
  matchIngredient,
  isNonFoodProduct,
  isLikelyFoodProduct,
};