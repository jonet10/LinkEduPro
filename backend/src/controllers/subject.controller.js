const prisma = require('../config/prisma');

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

    return res.json(
      subjects.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        questionCount: s._count.questions
      }))
    );
  } catch (error) {
    return next(error);
  }
}

module.exports = { listSubjects };
