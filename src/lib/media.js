const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const mediaBaseEnv = process.env.NEXT_PUBLIC_MEDIA_BASE_URL || '';

function normalizeBase(baseUrl) {
  return String(baseUrl || '').replace(/\/+$/, '');
}

function getBackendBaseUrl() {
  if (mediaBaseEnv) {
    return normalizeBase(mediaBaseEnv);
  }

  if (/^https?:\/\//i.test(apiUrl)) {
    return normalizeBase(apiUrl).replace(/\/api\/?$/, '');
  }

  return '';
}

export function resolveMediaUrl(url) {
  if (!url) return null;

  const raw = String(url).trim();
  if (!raw) return null;

  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) {
    return raw;
  }

  const backendBaseUrl = getBackendBaseUrl();
  if (!backendBaseUrl) {
    return raw;
  }

  if (raw.startsWith('/')) {
    return `${backendBaseUrl}${raw}`;
  }

  return `${backendBaseUrl}/${raw}`;
}

