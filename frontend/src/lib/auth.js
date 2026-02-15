const TOKEN_KEY = 'linkedupro_token';
const STUDENT_KEY = 'linkedupro_student';

export function setAuth(token, student) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(STUDENT_KEY, JSON.stringify(student));
  window.dispatchEvent(new Event('auth-changed'));
}

export function clearAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(STUDENT_KEY);
  window.dispatchEvent(new Event('auth-changed'));
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStudent() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STUDENT_KEY);
  return raw ? JSON.parse(raw) : null;
}
