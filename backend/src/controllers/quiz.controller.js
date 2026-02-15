const prisma = require('../config/prisma');

function toClientQuestion(question) {
  return {
    id: question.id,
    subjectId: question.subjectId,
    prompt: question.prompt,
    options: question.options
  };
}

async function getQuizQuestions(req, res, next) {
  try {
    const subjectId = Number(req.params.subjectId);
    const limit = Number(req.query.limit || 10);

    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) {
      return res.status(404).json({ message: 'Matiere introuvable.' });
    }

    const questions = await prisma.question.findMany({
      where: { subjectId },
      take: limit,
      orderBy: { id: 'asc' }
    });

    return res.json({
      subject: { id: subject.id, name: subject.name },
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

module.exports = { getQuizQuestions, submitQuiz };
