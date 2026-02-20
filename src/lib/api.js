import { clearAuth } from '@/lib/auth';
import { clearSchoolAuth } from '@/lib/schoolAuth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export async function apiClient(path, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body
  });

  const data = await res.json().catch(() => ({}));

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
