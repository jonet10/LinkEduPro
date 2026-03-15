export function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function toPercent(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return clamp(Math.round(n), 0, 100);
}

export function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function makeInitials(student) {
  const first = String(student?.firstName || '').trim();
  const last = String(student?.lastName || '').trim();
  const combo = `${first} ${last}`.trim();
  if (!combo) return 'LE';
  const parts = combo.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

export function masteryFromScore(score) {
  const pct = toPercent(score, 0);
  if (pct >= 80) return { label: 'Fort', tone: 'good' };
  if (pct >= 55) return { label: 'Stable', tone: 'mid' };
  return { label: 'Faible', tone: 'weak' };
}

export function estimateSuccessProbability(avgScore) {
  // Conservative: 25%..95%
  const pct = toPercent(avgScore, 0) / 100;
  return clamp(Math.round((0.25 + pct * 0.7) * 100), 25, 95);
}

export function formatMinutes(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '20 min';
  if (n < 60) return `${Math.round(n)} min`;
  const hours = Math.floor(n / 60);
  const mins = Math.round(n % 60);
  return mins ? `${hours} h ${mins} min` : `${hours} h`;
}

