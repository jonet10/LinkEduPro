const DEFAULT_LOCAL_API_BASE_URL = 'http://localhost:5000/api';
const LEGACY_BACKEND_HOSTS = new Set(['linkedupro-2.onrender.com']);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

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

function getHostname(value) {
  try {
    return new URL(String(value || '')).hostname.toLowerCase();
  } catch (_) {
    return '';
  }
}

function resolveBrowserApiBaseUrl(configuredApiBaseUrl) {
  if (typeof window === 'undefined') return '';

  const origin = String(window.location?.origin || '').replace(/\/+$/, '');
  if (!origin) return '';

  const configuredHost = getHostname(configuredApiBaseUrl);
  if (!configuredHost || LEGACY_BACKEND_HOSTS.has(configuredHost) || LOCAL_HOSTS.has(configuredHost)) {
    return `${origin}/api`;
  }

  return '';
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

export function getApiBaseUrl() {
  return resolveBrowserApiBaseUrl(API_BASE_URL) || API_BASE_URL;
}

export function getBackendOrigin() {
  return resolveBackendOrigin(getApiBaseUrl()) || BACKEND_ORIGIN;
}
