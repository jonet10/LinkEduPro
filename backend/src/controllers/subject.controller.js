const prisma = require('../config/prisma');

function isPhysicsSubjectName(name) {
  return name === 'Physique' || name.startsWith('Physique -');
}

async function listSubjects(req, res, next) {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { questions: true }
        }
      }
    });

    const physicsSubjects = subjects.filter((s) => isPhysicsSubjectName(s.name));
    const nonPhysics = subjects.filter((s) => !isPhysicsSubjectName(s.name));

    const mapped = nonPhysics.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      questionCount: s._count.questions
    }));

    if (physicsSubjects.length > 0) {
      physicsSubjects.sort((a, b) => a.id - b.id);
      mapped.push({
        id: physicsSubjects[0].id,
        name: 'Physique',
        description: 'Tous les quiz de physique (anciens examens + quiz thematiques).',
        questionCount: physicsSubjects.reduce((sum, s) => sum + s._count.questions, 0)
      });
    }

    mapped.sort((a, b) => a.name.localeCompare(b.name));

    return res.json(mapped);
  } catch (error) {
    return next(error);
  }
}

module.exports = { listSubjects };