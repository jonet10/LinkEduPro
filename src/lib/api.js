import { clearAuth } from '@/lib/auth';
import { clearSchoolAuth } from '@/lib/schoolAuth';
import { API_BASE_URL, getApiBaseUrl } from '@/lib/runtime-config';

export const API_URL = API_BASE_URL;

export async function apiClient(path, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...(options.headers || {})
  };

  const apiBaseUrl = getApiBaseUrl();
  const res = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body
  });

  const contentType = String(res.headers.get('content-type') || '').toLowerCase();
  const isJson = contentType.includes('application/json');
  const data = isJson
    ? await res.json().catch(() => ({}))
    : { message: await res.text().catch(() => '') };

  if (!isJson) {
    const error = new Error(`Réponse API invalide (${res.status}) depuis ${apiBaseUrl}${path}`);
    error.status = res.status;
    error.code = 'INVALID_API_RESPONSE';
    error.data = data;
    throw error;
  }

  if (!res.ok) {
    if (res.status === 401 && options.token && typeof window !== 'undefined') {
      clearAuth();
      clearSchoolAuth();

      const currentPath = window.location.pathname || '';
      const isSchoolArea = currentPath.startsWith('/school-management');
      const loginPath = isSchoolArea ? '/school-management/login' : '/login';

      if (currentPath !== loginPath) {
        window.location.assign(loginPath);
      }
    }

    const error = new Error(data.message || 'Erreur API');
    error.status = res.status;
    error.code = data.code;
    error.data = data;
    throw error;
  }

  return data;
}
