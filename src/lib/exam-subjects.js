export const OFFICIAL_9E_EXAM_SUBJECTS = [
  'Communication française',
  'Sciences expérimentales',
  'Communication créole',
  'Sciences sociales',
  'Anglais',
  'Mathématiques',
  'Espagnol'
];

export const COMMON_EXAM_SUBJECT_SUGGESTIONS = [
  'Mathématiques',
  'Physique',
  'Chimie',
  'SVT',
  'Français',
  'Histoire',
  'Géographie',
  'Philosophie',
  'Anglais',
  'Espagnol'
];

export function getExamSubjectSuggestions(level) {
  const base = level === '9e' ? OFFICIAL_9E_EXAM_SUBJECTS : COMMON_EXAM_SUBJECT_SUGGESTIONS;
  return Array.from(new Set(base)).sort((a, b) => a.localeCompare(b, 'fr'));
}

