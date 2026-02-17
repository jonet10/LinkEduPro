const prisma = require('../../config/prisma');
const { normalizeLevelInput, resolveStudentLevel, toApiLevel } = require('../utils/level');

function toApiQuiz(quiz) {
  return {
    id: quiz.id,
    level: toApiLevel(quiz.level),
    title: quiz.title,
    createdAt: quiz.createdAt,
    questionCount: quiz.questions?.length
  };
}

async function createQuiz(req, res, next) {
  try {
    const level = normalizeLevelInput(req.body.level);

    const payloadQuestions = req.body.questions;
    const invalid = payloadQuestions.find((q) => !q.options.includes(q.correctAnswer));
    if (invalid) {
      return res.status(400).json({ message: 'Chaque reponse correcte doit exister dans options.' });
    }

    const quiz = await prisma.levelQuiz.create({
      data: {
        level,
        title: req.body.title,
        questions: {
          create: payloadQuestions.map((q) => ({
            questionText: q.questionText,
            options: q.options,
            correctAnswer: q.correctAnswer
          }))
        }
      },
      include: { questions: true }
    });

    return res.status(201).json({ quiz: toApiQuiz(quiz) });
  } catch (error) {
    return next(error);
  }
}

async function listQuizzes(req, res, next) {
  try {
    const student = await prisma.student.findUnique({ where: { id: req.user.id } });
    if (!student) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    const queryLevel = req.query.level ? normalizeLevelInput(req.query.level) : null;
    const level = queryLevel || resolveStudentLevel(student);

    if (!level) {
      return res.status(400).json({ message: 'Niveau utilisateur non defini.' });
    }

    const quizzes = await prisma.levelQuiz.findMany({
      where: { level },
      include: { questions: true },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      level: toApiLevel(level),
      quizzes: quizzes.map(toApiQuiz)
    });
  } catch (error) {
    return next(error);
  }
}

async function getQuizDetails(req, res, next) {
  try {
    const quizId = Number(req.params.quizId);
    if (!Number.isInteger(quizId) || quizId <= 0) {
      return res.status(400).json({ message: 'Identifiant de quiz invalide.' });
    }

    const quiz = await prisma.levelQuiz.findUnique({
      where: { id: quizId },
      include: { questions: true }
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz introuvable.' });
    }

    return res.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        level: toApiLevel(quiz.level),
        createdAt: quiz.createdAt,
        questions: quiz.questions.map((q) => ({
          id: q.id,
          questionText: q.questionText,
          options: q.options
        }))
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function submitQuiz(req, res, next) {
  try {
    const quizId = Number(req.params.quizId);
    if (!Number.isInteger(quizId) || quizId <= 0) {
      return res.status(400).json({ message: 'Identifiant de quiz invalide.' });
    }

    const quiz = await prisma.levelQuiz.findUnique({
      where: { id: quizId },
      include: { questions: true }
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz introuvable.' });
    }

    const answerMap = new Map(req.body.answers.map((a) => [a.questionId, String(a.answer).trim()]));
    let score = 0;

    quiz.questions.forEach((question) => {
      const userAnswer = answerMap.get(question.id);
      if (userAnswer !== undefined && userAnswer === String(question.correctAnswer).trim()) {
        score += 1;
      }
    });

    const result = await prisma.quizResult.create({
      data: {
        userId: req.user.id,
        quizId,
        score
      }
    });

    return res.status(201).json({
      resultId: result.id,
      score,
      totalQuestions: quiz.questions.length,
      percentage: quiz.questions.length ? Math.round((score / quiz.questions.length) * 100) : 0,
      completedAt: result.completedAt
    });
  } catch (error) {
    return next(error);
  }
}

async function getMyQuizResults(req, res, next) {
  try {
    const results = await prisma.quizResult.findMany({
      where: { userId: req.user.id },
      include: { quiz: true },
      orderBy: { completedAt: 'desc' }
    });

    return res.json({
      results: results.map((r) => ({
        id: r.id,
        score: r.score,
        completedAt: r.completedAt,
        quiz: {
          id: r.quiz.id,
          title: r.quiz.title,
          level: toApiLevel(r.quiz.level)
        }
      }))
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createQuiz,
  listQuizzes,
  getQuizDetails,
  submitQuiz,
  getMyQuizResults
};
