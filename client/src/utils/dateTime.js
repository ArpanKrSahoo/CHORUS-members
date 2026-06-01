export function formatDateTime(timestamp) {
  if (!timestamp?.toDate) return "Date pending";

  return timestamp.toDate().toLocaleString(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getLocalDateTimeValue(timestamp) {
  if (!timestamp?.toDate) return "";

  const date = timestamp.toDate();
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

export function getTimestampDateValue(timestamp) {
  return timestamp?.toDate?.() ?? new Date(0);
}
