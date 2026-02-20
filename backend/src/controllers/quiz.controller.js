const prisma = require('../config/prisma');

function toClientQuestion(question) {
  return {
    id: question.id,
    subjectId: question.subjectId,
    prompt: question.prompt,
    options: question.options,
    answerType: question.answerType || 'MCQ'
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
    const premium = ['1', 'true', true].includes(req.query.premium);

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

    const baseWhere = premium
      ? { subjectId: targetSubject.id, isPremium: true }
      : { subjectId: targetSubject.id };

    let questions = await prisma.question.findMany({
      where: baseWhere,
      take: limit,
      orderBy: premium
        ? [{ frequencyScore: 'desc' }, { id: 'asc' }]
        : [{ id: 'asc' }]
    });

    // Fallback safe if no premium questions exist for this subject.
    if (premium && questions.length === 0) {
      questions = await prisma.question.findMany({
        where: { subjectId: targetSubject.id },
        take: limit,
        orderBy: [{ id: 'asc' }]
      });
    }

    return res.json({
      subject: { id: subject.id, name: subjectLabel },
      selectedSet,
      mode: premium ? 'premium' : 'standard',
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
    const answerMap = new Map(answers.map((a) => [a.questionId, a]));
    let score = 0;

    const normalizeTextAnswer = (value) =>
      String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

    const normalizedAnswers = questions.map((q) => {
      const ans = answerMap.get(q.id) || {};
      const answerType = q.answerType || 'MCQ';
      const selectedText = typeof ans.selectedText === 'string' ? ans.selectedText.trim() : null;
      const selectedOption = Number.isInteger(ans.selectedOption) ? ans.selectedOption : null;

      let isCorrect = false;
      if (answerType === 'TEXT') {
        isCorrect = normalizeTextAnswer(selectedText) === normalizeTextAnswer(q.correctText);
      } else {
        if (!Number.isInteger(selectedOption)) {
          throw Object.assign(new Error('Option de reponse manquante.'), { statusCode: 400 });
        }
        isCorrect = q.correctOption === selectedOption;
      }

      if (isCorrect) score += 1;

      return {
        questionId: q.id,
        selectedOption: answerType === 'TEXT' ? -1 : selectedOption,
        selectedText: answerType === 'TEXT' ? selectedText : null,
        isCorrect
      };
    });

    const review = normalizedAnswers.map((ans) => {
      const question = questionMap.get(ans.questionId);
      return {
        questionId: question.id,
        prompt: question.prompt,
        options: question.options,
        answerType: question.answerType || 'MCQ',
        selectedOption: ans.selectedOption,
        selectedText: ans.selectedText,
        correctOption: question.correctOption,
        correctText: question.correctText,
        isCorrect: ans.isCorrect,
        explanation: question.explanation || null
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
      percentage: Math.round((score / answers.length) * 100),
      likesCount: 0,
      likedByMe: false,
      review
    });
  } catch (error) {
    if (error?.statusCode === 400) {
      return res.status(400).json({ message: error.message });
    }
    return next(error);
  }
}

async function getQuizAttemptLikeState(req, res, next) {
  try {
    const attemptId = Number(req.params.attemptId);
    const studentId = req.user.id;

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      select: { id: true }
    });
    if (!attempt) {
      return res.status(404).json({ message: 'Tentative de quiz introuvable.' });
    }

    const [liked, likesCount] = await Promise.all([
      prisma.quizAttemptLike.findUnique({
        where: {
          attemptId_userId: { attemptId, userId: studentId }
        },
        select: { id: true }
      }),
      prisma.quizAttemptLike.count({ where: { attemptId } })
    ]);

    return res.json({
      attemptId,
      likedByMe: Boolean(liked),
      likesCount
    });
  } catch (error) {
    return next(error);
  }
}

async function toggleQuizAttemptLike(req, res, next) {
  try {
    const attemptId = Number(req.params.attemptId);
    const studentId = req.user.id;

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      select: { id: true }
    });
    if (!attempt) {
      return res.status(404).json({ message: 'Tentative de quiz introuvable.' });
    }

    const existing = await prisma.quizAttemptLike.findUnique({
      where: {
        attemptId_userId: { attemptId, userId: studentId }
      },
      select: { id: true }
    });

    let likedByMe = false;
    if (existing) {
      await prisma.quizAttemptLike.delete({ where: { id: existing.id } });
      likedByMe = false;
    } else {
      await prisma.quizAttemptLike.create({
        data: {
          attemptId,
          userId: studentId
        }
      });
      likedByMe = true;
    }

    const likesCount = await prisma.quizAttemptLike.count({ where: { attemptId } });
    return res.json({
      attemptId,
      likedByMe,
      likesCount
    });
  } catch (error) {
    return next(error);
  }
}

async function getPremiumInsights(req, res, next) {
  try {
    const subjectId = Number(req.params.subjectId);
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) {
      return res.status(404).json({ message: 'Matiere introuvable.' });
    }

    const premiumQuestions = await prisma.question.findMany({
      where: { subjectId, isPremium: true },
      select: { sourceTopic: true, frequencyScore: true }
    });

    const topicMap = new Map();
    for (const q of premiumQuestions) {
      const key = q.sourceTopic || 'General';
      if (!topicMap.has(key)) topicMap.set(key, { topic: key, count: 0, score: 0 });
      const t = topicMap.get(key);
      t.count += 1;
      t.score += q.frequencyScore || 0;
    }

    const topics = Array.from(topicMap.values()).sort((a, b) => b.score - a.score || b.count - a.count);
    return res.json({
      subject: { id: subject.id, name: subject.name },
      premiumQuestionCount: premiumQuestions.length,
      topics
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getQuizSets,
  getQuizQuestions,
  submitQuiz,
  getPremiumInsights,
  getQuizAttemptLikeState,
  toggleQuizAttemptLike
};
