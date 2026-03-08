const DEFAULT_LOCAL_API_BASE_URL = `http://localhost:${process.env.PORT || 5000}/api`;

function normalizeApiBaseUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return DEFAULT_LOCAL_API_BASE_URL;
  if (!/^https?:\/\//i.test(raw)) return DEFAULT_LOCAL_API_BASE_URL;
  return raw.replace(/\/+$/, '');
}

const API_BASE_URL = normalizeApiBaseUrl(process.env.API_BASE_URL);

module.exports = {
  API_BASE_URL
};
