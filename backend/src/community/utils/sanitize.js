function stripHtml(input) {
  return String(input || '').replace(/<[^>]*>?/gm, '');
}

function sanitizeText(input, max = 10000) {
  return stripHtml(input).replace(/\s+/g, ' ').trim().slice(0, max);
}

module.exports = { sanitizeText };
