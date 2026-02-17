const SCHOOL_TOKEN_KEY = 'linkedupro_school_token';
const SCHOOL_ADMIN_KEY = 'linkedupro_school_admin';

export function setSchoolAuth(token, admin) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SCHOOL_TOKEN_KEY, token);
  localStorage.setItem(SCHOOL_ADMIN_KEY, JSON.stringify(admin));
}

export function getSchoolToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SCHOOL_TOKEN_KEY);
}

export function getSchoolAdmin() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(SCHOOL_ADMIN_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearSchoolAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SCHOOL_TOKEN_KEY);
  localStorage.removeItem(SCHOOL_ADMIN_KEY);
}
