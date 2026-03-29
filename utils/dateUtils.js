function parseWorkbookDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  return null;
}

function formatDateDisplay(date) {
  if (!date) return '';
  return date.toLocaleDateString('en-CA');
}

module.exports = {
  parseWorkbookDate,
  formatDateDisplay
};
