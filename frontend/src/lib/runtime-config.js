const DEFAULT_LOCAL_API_BASE_URL = 'http://localhost:5000/api';

function normalizeApiBaseUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (!/^https?:\/\//i.test(raw)) return '';

  try {
    const url = new URL(raw);
    const pathname = (url.pathname || '/').replace(/\/+$/, '');
    if (!pathname || pathname === '/') {
      url.pathname = '/api';
      return url.toString().replace(/\/+$/, '');
    }
    return url.toString().replace(/\/+$/, '');
  } catch (_) {
    return raw.replace(/\/+$/, '');
  }
}

function resolveBackendOrigin(apiBaseUrl) {
  try {
    return new URL(apiBaseUrl).origin;
  } catch (_) {
    return '';
  }
}

const configuredApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_BASE_URL ||
  '';

export const API_BASE_URL =
  normalizeApiBaseUrl(configuredApiBaseUrl) || DEFAULT_LOCAL_API_BASE_URL;

export const BACKEND_ORIGIN =
  normalizeApiBaseUrl(process.env.NEXT_PUBLIC_BACKEND_ORIGIN) ||
  resolveBackendOrigin(API_BASE_URL) ||
  'http://localhost:5000';
