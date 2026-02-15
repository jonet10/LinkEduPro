const prisma = require('../config/prisma');

function toClientQuestion(question) {
  return {
    id: question.id,
    subjectId: question.subjectId,
    prompt: question.prompt,
    options: question.options
  };
}

function isPhysicsSubjectName(name) {
  return name === 'Physique' || name.startsWith('Physique -');
}

function toSetName(subjectName) {
  if (subjectName === 'Physique') return 'Revision generale';
  return subjectName.replace('Physique - ', '');
}

async function getPhysicsSubjects() {
  return prisma.subject.findMany({
    where: {
      OR: [{ name: 'Physique' }, { name: { startsWith: 'Physique -' } }]
    },
    include: {
      _count: {
        select: { questions: true }
      }
    },
    orderBy: { id: 'asc' }
  });
}

async function getQuizSets(req, res, next) {
  try {
    const subjectId = Number(req.params.subjectId);
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });

    if (!subject) {
      return res.status(404).json({ message: 'Matiere introuvable.' });
    }

    if (!isPhysicsSubjectName(subject.name)) {
      return res.json({
        subject: { id: subject.id, name: subject.name },
        sets: [{ key: 'default', name: 'Quiz principal', questionCount: await prisma.question.count({ where: { subjectId } }) }]
      });
    }

    const physicsSubjects = await getPhysicsSubjects();
    const sets = physicsSubjects.map((s) => ({
      key: String(s.id),
      name: toSetName(s.name),
      questionCount: s._count.questions
    }));

    return res.json({
      subject: { id: subject.id, name: 'Physique' },
      sets
    });
  } catch (error) {
    return next(error);
  }
}

async function getQuizQuestions(req, res, next) {
  try {
    const subjectId = Number(req.params.subjectId);
    const limit = Number(req.query.limit || 10);
    const set = req.query.set;

    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) {
      return res.status(404).json({ message: 'Matiere introuvable.' });
    }

    let targetSubject = subject;
    let subjectLabel = subject.name;
    let selectedSet = null;

    if (isPhysicsSubjectName(subject.name)) {
      const physicsSubjects = await getPhysicsSubjects();
      const chosen = set
        ? physicsSubjects.find((s) => String(s.id) === String(set))
        : physicsSubjects.find((s) => s.id === subjectId) || physicsSubjects[0];

      if (!chosen) {
        return res.status(404).json({ message: 'Quiz de physique introuvable.' });
      }

      targetSubject = chosen;
      subjectLabel = 'Physique';
      selectedSet = { key: String(chosen.id), name: toSetName(chosen.name) };
    }

    const questions = await prisma.question.findMany({
      where: { subjectId: targetSubject.id },
      take: limit,
      orderBy: { id: 'asc' }
    });

    return res.json({
      subject: { id: subject.id, name: subjectLabel },
      selectedSet,
      questions: questions.map(toClientQuestion)
    });
  } catch (error) {
    return next(error);
  }
}

async function submitQuiz(req, res, next) {
  try {
    const studentId = req.user.id;
    const { subjectId, answers, startedAt, durationSec } = req.body;

    const questionIds = answers.map((a) => a.questionId);
    const questions = await prisma.question.findMany({
      where: { subjectId, id: { in: questionIds } }
    });

    if (questions.length !== questionIds.length) {
      return res.status(400).json({ message: 'Certaines questions sont invalides.' });
    }

    const questionMap = new Map(questions.map((q) => [q.id, q]));
    let score = 0;

    const normalizedAnswers = answers.map((ans) => {
      const q = questionMap.get(ans.questionId);
      const isCorrect = q.correctOption === ans.selectedOption;
      if (isCorrect) score += 1;

      return {
        questionId: ans.questionId,
        selectedOption: ans.selectedOption,
        isCorrect
      };
    });

    const attempt = await prisma.quizAttempt.create({
      data: {
        studentId,
        subjectId,
        startedAt: new Date(startedAt),
        finishedAt: new Date(),
        durationSec,
        score,
        totalQuestions: answers.length,
        answers: {
          create: normalizedAnswers
        }
      }
    });

    return res.status(201).json({
      attemptId: attempt.id,
      score,
      totalQuestions: answers.length,
      percentage: Math.round((score / answers.length) * 100)
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getQuizSets, getQuizQuestions, submitQuiz };