const API_TO_PRISMA_LEVEL = {
  '9e': 'LEVEL_9E',
  NS1: 'NS1',
  NS2: 'NS2',
  NS3: 'NS3',
  Terminale: 'TERMINALE',
  Universite: 'UNIVERSITE'
};

const PRISMA_TO_API_LEVEL = {
  LEVEL_9E: '9e',
  NS1: 'NS1',
  NS2: 'NS2',
  NS3: 'NS3',
  TERMINALE: 'Terminale',
  UNIVERSITE: 'Universite'
};

const ACADEMIC_TO_EDUCATION_LEVEL = {
  LEVEL_9E: 'LEVEL_9E',
  NSI: 'NS1',
  NSII: 'NS2',
  NSIII: 'NS3',
  NSIV: 'TERMINALE',
  UNIVERSITAIRE: 'UNIVERSITE'
};

function normalizeLevelInput(value) {
  if (!value || typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;

  if (API_TO_PRISMA_LEVEL[raw]) return API_TO_PRISMA_LEVEL[raw];

  const upper = raw.toUpperCase();
  if (PRISMA_TO_API_LEVEL[upper]) return upper;

  if (raw.toLowerCase() === 'terminale') return 'TERMINALE';
  if (raw.toLowerCase() === 'universite') return 'UNIVERSITE';
  if (raw.toLowerCase() === '9e') return 'LEVEL_9E';

  return null;
}

function toApiLevel(prismaValue) {
  if (!prismaValue) return null;
  return PRISMA_TO_API_LEVEL[prismaValue] || null;
}

function resolveStudentLevel(student) {
  const academic = student?.studentProfile?.level;
  if (academic && ACADEMIC_TO_EDUCATION_LEVEL[academic]) {
    return ACADEMIC_TO_EDUCATION_LEVEL[academic];
  }

  if (student?.level) {
    return student.level;
  }

  return normalizeLevelInput(student?.gradeLevel || null);
}

module.exports = {
  normalizeLevelInput,
  toApiLevel,
  resolveStudentLevel,
  API_TO_PRISMA_LEVEL,
  PRISMA_TO_API_LEVEL
};
