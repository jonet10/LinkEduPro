function normalizeValue(value) {
  return String(value || '').trim();
}

function makeStudentId({ schoolId, academicYearLabel, firstName, lastName, index }) {
  const safeYear = normalizeValue(academicYearLabel).replace(/\s+/g, '').slice(0, 6).toUpperCase() || 'YEAR';
  const initials = `${normalizeValue(firstName).slice(0, 1)}${normalizeValue(lastName).slice(0, 1)}`.toUpperCase() || 'XX';
  const suffix = String(index).padStart(4, '0');
  return `S${schoolId}-${safeYear}-${initials}${suffix}`;
}

module.exports = { makeStudentId };
