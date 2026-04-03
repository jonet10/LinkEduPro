import { getApiBaseUrl, getBackendOrigin } from '@/lib/runtime-config';

const mediaBaseEnv = process.env.NEXT_PUBLIC_MEDIA_BASE_URL || '';

function normalizeBase(baseUrl) {
  return String(baseUrl || '').replace(/\/+$/, '');
}

function getBackendBaseUrl() {
  if (mediaBaseEnv) {
    return normalizeBase(mediaBaseEnv);
  }

  const backendOrigin = getBackendOrigin();
  if (backendOrigin) return normalizeBase(backendOrigin);
  return normalizeBase(getApiBaseUrl().replace(/\/api\/?$/, ''));
}

export function resolveMediaUrl(url) {
  if (!url) return null;

  const rawInput = String(url).trim();
  const raw = rawInput.replace(/^\/api\/storage\//i, '/storage/');
  if (!raw) return null;

  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) {
    return raw;
  }

  const backendBaseUrl = getBackendBaseUrl();
  if (!backendBaseUrl) {
    return raw;
  }

  const normalizedBase = backendBaseUrl.replace(/\/+$/, '');
  if (normalizedBase.endsWith('/api') && raw.startsWith('/api/')) {
    return `${normalizedBase.replace(/\/api$/, '')}${encodeURI(raw)}`;
  }

  if (raw.startsWith('/')) {
    return `${normalizedBase}${encodeURI(raw)}`;
  }

  return `${normalizedBase}/${encodeURI(raw)}`;
}
