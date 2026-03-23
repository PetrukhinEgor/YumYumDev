// YumYum-server/utils/productMatcher.js

const matchIngredient = (productName) => {
  if (!productName) return null;

  const name = productName.toLowerCase();

  // яйца
  if (name.includes("яйц")) return "Яйца";

  // молоко
  if (name.includes("молок")) return "Молоко";

  // кефир
  if (name.includes("кефир")) return "Кефир";

  // сметана
  if (name.includes("сметан")) return "Сметана";

  // творог
  if (name.includes("творог")) return "Творог";

  // соль
  if (name.includes("соль")) return "Соль";

  // морковь
  // важно: не матчим слишком агрессивно комбинированные продукты,
  // но пока для диплома оставим базовое правило
  if (name.includes("морков")) return "Морковь";

  // огурец
  if (name.includes("огур")) return "Огурец";

  // помидор / томат / черри
  if (
    name.includes("томат") ||
    name.includes("помидор") ||
    name.includes("черри")
  ) {
    return "Помидор";
  }

  // картофель
  if (name.includes("картоф")) return "Картофель";

  // сыр
  if (name.includes("сыр")) return "Сыр";

  // курица / куриное
  if (
    name.includes("куриц") ||
    name.includes("цыпл") ||
    name.includes("филе кур")
  ) {
    return "Курица";
  }

  // рис
  if (name.includes("рис")) return "Рис";

  // макароны / лапша
  if (
    name.includes("макарон") ||
    name.includes("лапша")
  ) {
    return "Макароны";
  }

  // мука
  if (name.includes("мука")) return "Мука";

  // сахар
  if (name.includes("сахар")) return "Сахар";

  // лук
  if (name.includes("лук")) return "Лук";

  // чеснок
  if (name.includes("чеснок")) return "Чеснок";

  // укроп
  if (name.includes("укроп")) return "Укроп";

  // свекла
  if (name.includes("свекл")) return "Свекла";

  // виноград
  if (name.includes("виноград")) return "Виноград";

  // киви
  if (name.includes("киви")) return "Киви";

  return null;
};

module.exports = matchIngredient;