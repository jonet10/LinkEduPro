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
