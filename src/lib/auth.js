const TOKEN_KEY = 'linkedupro_token';
const STUDENT_KEY = 'linkedupro_student';
const DARK_MODE_KEY = 'linkedupro_dark_mode';

const LEVEL_TO_ACADEMIC = {
  NS1: 'NSI',
  NS2: 'NSII',
  NS3: 'NSIII',
  Terminale: 'NSIV',
  Universite: 'Universitaire'
};

function applyTheme(enabled) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', Boolean(enabled));
}

export function setAuth(token, student) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(STUDENT_KEY, JSON.stringify(student));

  const darkMode = Boolean(student?.darkMode);
  localStorage.setItem(DARK_MODE_KEY, darkMode ? '1' : '0');
  applyTheme(darkMode);

  window.dispatchEvent(new Event('auth-changed'));
}

export function clearAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(STUDENT_KEY);
  localStorage.removeItem(DARK_MODE_KEY);
  applyTheme(false);
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

export function normalizeAcademicLevel(student) {
  if (!student) return null;

  const direct = typeof student.academicLevel === 'string' ? student.academicLevel.trim() : '';
  if (direct) return direct;

  const fallback = typeof student.level === 'string' ? student.level.trim() : '';
  if (!fallback) return null;

  return LEVEL_TO_ACADEMIC[fallback] || fallback;
}

export function isNsivStudent(student) {
  if (!student || student.role !== 'STUDENT') return false;
  const level = normalizeAcademicLevel(student);
  return level === 'NSIV';
}

export function getDarkMode() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DARK_MODE_KEY) === '1';
}

export function setDarkModePreference(enabled) {
  if (typeof window === 'undefined') return;

  localStorage.setItem(DARK_MODE_KEY, enabled ? '1' : '0');
  applyTheme(enabled);

  const student = getStudent();
  if (student) {
    const nextStudent = { ...student, darkMode: Boolean(enabled) };
    localStorage.setItem(STUDENT_KEY, JSON.stringify(nextStudent));
  }

  window.dispatchEvent(new Event('auth-changed'));
}

export function initThemeFromStorage() {
  applyTheme(getDarkMode());
}
