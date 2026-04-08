export function formatDateDisplay(value, options = {}, fallback = "") {
  if (!value) return fallback;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? value : fallback;
  }

  return date.toLocaleDateString([], options);
}

export function formatDateTimeDisplay(value, options = {}, fallback = "") {
  if (!value) return fallback;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? value : fallback;
  }

  return date.toLocaleString([], options);
}

export function formatTimeDisplay(value, options = {}, fallback = "") {
  if (!value) return fallback;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? value : fallback;
  }

  return date.toLocaleTimeString([], options);
}
