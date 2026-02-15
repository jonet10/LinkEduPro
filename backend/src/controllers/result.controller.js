const prisma = require('../config/prisma');

async function getProgress(req, res, next) {
  try {
    const studentId = req.user.id;

    const attempts = await prisma.quizAttempt.findMany({
      where: { studentId },
      include: { subject: true },
      orderBy: { createdAt: 'desc' }
    });

    const totalAttempts = attempts.length;
    const avgScore = totalAttempts
      ? Math.round(
          attempts.reduce((sum, a) => sum + (a.score / a.totalQuestions) * 100, 0) / totalAttempts
        )
      : 0;

    const bySubject = {};
    attempts.forEach((a) => {
      const key = a.subject.name;
      const pct = Math.round((a.score / a.totalQuestions) * 100);
      if (!bySubject[key]) {
        bySubject[key] = { subject: key, attempts: 0, best: 0, average: 0, _sum: 0 };
      }
      bySubject[key].attempts += 1;
      bySubject[key]._sum += pct;
      bySubject[key].best = Math.max(bySubject[key].best, pct);
    });

    const subjectStats = Object.values(bySubject).map((s) => ({
      subject: s.subject,
      attempts: s.attempts,
      best: s.best,
      average: Math.round(s._sum / s.attempts)
    }));

    const recentAttempts = attempts.slice(0, 10).map((a) => ({
      id: a.id,
      subject: a.subject.name,
      score: a.score,
      totalQuestions: a.totalQuestions,
      percentage: Math.round((a.score / a.totalQuestions) * 100),
      finishedAt: a.finishedAt,
      durationSec: a.durationSec
    }));

    return res.json({
      overview: { totalAttempts, averageScore: avgScore },
      subjectStats,
      recentAttempts
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getProgress };
