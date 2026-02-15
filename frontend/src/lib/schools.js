export const SCHOOL_DIRECTORY = {
  OUEST: {
    'Port-au-Prince': ['Lycee National de Petion-Ville', 'College Canado-Haitien'],
    Delmas: ['Institution Mixte Delmas']
  },
  ARTIBONITE: {
    Gonaives: ['Lycee Fabre Geffrard']
  },
  NORD: {
    CapHaitien: ['Lycee Philippe Guerrier']
  }
};

export function getDepartments() {
  return Object.keys(SCHOOL_DIRECTORY);
}

export function getCommunes(department) {
  if (!department || !SCHOOL_DIRECTORY[department]) return [];
  return Object.keys(SCHOOL_DIRECTORY[department]);
}

export function getSchools(department, commune) {
  if (!department || !commune) return [];
  return SCHOOL_DIRECTORY[department]?.[commune] || [];
}
