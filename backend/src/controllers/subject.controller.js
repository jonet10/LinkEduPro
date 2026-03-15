const prisma = require('../config/prisma');

const SUBJECT_GROUPS = [
  { key: 'mathematiques', label: 'Mathematiques', aliases: ['mathematiques', 'maths', 'math'] },
  { key: 'physique', label: 'Physique', aliases: ['physique'] },
  { key: 'chimie', label: 'Chimie', aliases: ['chimie'] },
  { key: 'svt', label: 'SVT', aliases: ['svt', 'science de la vie', 'science de la terre'] },
  { key: 'histoire-geo', label: 'Histoire-Geo', aliases: ['histoire-geo', 'histoire geo', 'geo-histoire', 'hist geo'] },
  { key: 'philosophie', label: 'Philosophie', aliases: ['philosophie', 'philo'] },
  { key: 'informatique', label: 'Informatique', aliases: ['informatique'] },
  { key: 'anglais', label: 'Anglais', aliases: ['anglais'] },
  { key: 'espagnol', label: 'Espagnol', aliases: ['espagnol'] },
  { key: 'kreyol', label: 'Kreyol', aliases: ['kreyol', 'kretol', 'creole'] },
  { key: 'arts', label: 'Arts', aliases: ['arts', 'art'] },
  { key: 'economie', label: 'Economie', aliases: ['economie', 'economique'] }
];

function normalizeName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function findGroupForSubjectName(name) {
  const normalized = normalizeName(name);

  for (const group of SUBJECT_GROUPS) {
    for (const alias of group.aliases) {
      const base = normalizeName(alias);
      if (!base) continue;
      if (normalized === base || normalized.startsWith(`${base} -`) || normalized.startsWith(`${base}:`)) {
        return group;
      }
    }
  }
  return null;
}

function pickRepresentativeSubject(subjects, groupLabel) {
  const normalizedGroup = normalizeName(groupLabel);
  const exact = subjects.find((s) => normalizeName(s.name) === normalizedGroup);
  if (exact) return exact;
  return [...subjects].sort((a, b) => a.id - b.id)[0];
}

const EDUCATION_TO_ACADEMIC = {
  LEVEL_9E: 'LEVEL_9E',
  NS1: 'NSI',
  NS2: 'NSII',
  NS3: 'NSIII',
  TERMINALE: 'NSIV',
  UNIVERSITE: 'UNIVERSITAIRE'
};

async function resolveViewerAcademicLevel(userId) {
  if (!userId) return null;
  const student = await prisma.student.findUnique({
    where: { id: userId },
    include: { studentProfile: true }
  });
  if (!student) return null;
  return student.studentProfile?.level || EDUCATION_TO_ACADEMIC[student.level] || null;
}

function is9eSubject(subjectName) {
  const normalized = normalizeName(subjectName).replace(/\s+/g, ' ');
  return normalized.startsWith('9e') || normalized.startsWith('9eme') || normalized.startsWith('9ème');
}

function extractAcademicLevelFromSubjectName(subjectName) {
  const normalized = normalizeName(subjectName).replace(/\s+/g, ' ');
  if (!normalized) return null;

  if (/^(9e|9eme|9eme)\b/.test(normalized)) return 'LEVEL_9E';
  if (/\b(nsiv|ns4|terminale|bac)\b/.test(normalized)) return 'NSIV';
  if (/\b(nsiii|ns3)\b/.test(normalized)) return 'NSIII';
  if (/\b(nsii|ns2)\b/.test(normalized)) return 'NSII';
  if (/\b(nsi|ns1)\b/.test(normalized)) return 'NSI';
  if (/\b(universitaire|universite|fac)\b/.test(normalized)) return 'UNIVERSITAIRE';

  return null;
}

async function listSubjects(req, res, next) {
  try {
    const viewerLevel = req.user?.role === 'STUDENT'
      ? await resolveViewerAcademicLevel(req.user.id)
      : null;

    const subjects = await prisma.subject.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { questions: true }
        }
      }
    });

    const groupedBuckets = new Map();
    const ungrouped = [];

    for (const subject of subjects) {
      if (viewerLevel) {
        const subjectLevel = extractAcademicLevelFromSubjectName(subject.name);
        if (viewerLevel === 'LEVEL_9E') {
          // 9e: uniquement les rubriques explicitement 9e.
          if (subjectLevel !== 'LEVEL_9E') continue;
        } else if (subjectLevel && subjectLevel !== viewerLevel) {
          // Autres niveaux: si la rubrique annonce un niveau, il doit correspondre.
          continue;
        }
      }

      const group = findGroupForSubjectName(subject.name);
      if (!group) {
        ungrouped.push(subject);
        continue;
      }

      if (!groupedBuckets.has(group.key)) {
        groupedBuckets.set(group.key, { group, subjects: [] });
      }
      groupedBuckets.get(group.key).subjects.push(subject);
    }

    const mapped = ungrouped.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      questionCount: s._count.questions
    }));

    for (const bucket of groupedBuckets.values()) {
      const representative = pickRepresentativeSubject(bucket.subjects, bucket.group.label);
      const totalQuestions = bucket.subjects.reduce((sum, s) => sum + s._count.questions, 0);
      const fallbackDescription = `Tous les quiz de ${bucket.group.label} regroupes dans un meme espace.`;
      mapped.push({
        id: representative.id,
        name: bucket.group.label,
        description: representative.description || fallbackDescription,
        questionCount: totalQuestions
      });
    }

    mapped.sort((a, b) => a.name.localeCompare(b.name));
    return res.json(mapped);
  } catch (error) {
    return next(error);
  }
}

module.exports = { listSubjects };
