const DISPLAY_DATE_PATTERN = /^\d{2}-\d{2}-\d{4}$/;
const API_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDisplayDate(value) {
  return DISPLAY_DATE_PATTERN.test(String(value || "").trim());
}

export function toDisplayDate(apiDate) {
  const value = String(apiDate || "").trim();

  if (!API_DATE_PATTERN.test(value)) return value;

  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}

export function toApiDate(displayDate) {
  const value = String(displayDate || "").trim();

  if (!value) return "";
  if (API_DATE_PATTERN.test(value)) return value;
  if (!DISPLAY_DATE_PATTERN.test(value)) return null;

  const [day, month, year] = value.split("-");
  return `${year}-${month}-${day}`;
}
