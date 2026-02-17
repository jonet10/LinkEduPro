function normalizeTags(raw) {
  if (!raw) return [];

  const values = Array.isArray(raw)
    ? raw.flatMap((v) => String(v).split(','))
    : String(raw).split(',');

  const unique = new Set();
  values
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => unique.add(value.toLowerCase()));

  return Array.from(unique).slice(0, 10);
}

function includesInsensitive(value, search) {
  if (!value || !search) return false;
  return String(value).toLowerCase().includes(String(search).toLowerCase());
}

function popularityEnabled(raw) {
  return ['1', 'true', true, 'most_viewed'].includes(raw);
}

function scoreResult({ query, title, content, tags = [] }) {
  let score = 0;
  if (includesInsensitive(title, query)) score += 3;
  if (tags.some((tag) => includesInsensitive(tag, query))) score += 2;
  if (includesInsensitive(content, query)) score += 1;
  return score;
}

function extractHighlighted(text, query) {
  if (!text) return '';
  const q = String(query || '').trim();
  if (!q) return text;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${escaped})`, 'ig'), '<mark>$1</mark>');
}

module.exports = {
  normalizeTags,
  popularityEnabled,
  scoreResult,
  extractHighlighted
};
