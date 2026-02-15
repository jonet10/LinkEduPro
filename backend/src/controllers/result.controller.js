const prisma = require('../config/prisma');

function initials(firstName, lastName) {
  const f = (firstName || '').trim().charAt(0).toUpperCase();
  const l = (lastName || '').trim().charAt(0).toUpperCase();
  return `${f}${l}`;
}

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

async function getCommunity(req, res, next) {
  try {
    const currentStudentId = req.user.id;

    const attempts = await prisma.quizAttempt.findMany({
      include: {
        subject: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            school: true,
            gradeLevel: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 300
    });

    const byStudent = new Map();
    for (const a of attempts) {
      if (!byStudent.has(a.student.id)) {
        byStudent.set(a.student.id, {
          studentId: a.student.id,
          displayName: initials(a.student.firstName, a.student.lastName),
          school: a.student.school,
          gradeLevel: a.student.gradeLevel,
          attempts: 0,
          best: 0,
          sumPct: 0
        });
      }

      const row = byStudent.get(a.student.id);
      const pct = Math.round((a.score / a.totalQuestions) * 100);
      row.attempts += 1;
      row.sumPct += pct;
      row.best = Math.max(row.best, pct);
    }

    const leaderboard = Array.from(byStudent.values())
      .map((r) => ({
        studentId: r.studentId,
        displayName: r.displayName,
        school: r.school,
        gradeLevel: r.gradeLevel,
        attempts: r.attempts,
        average: Math.round(r.sumPct / r.attempts),
        best: r.best
      }))
      .sort((a, b) => b.average - a.average || b.best - a.best || b.attempts - a.attempts)
      .slice(0, 12);

    const recent = attempts.slice(0, 20).map((a) => ({
      attemptId: a.id,
      displayName: initials(a.student.firstName, a.student.lastName),
      school: a.student.school,
      gradeLevel: a.student.gradeLevel,
      subject: a.subject.name,
      percentage: Math.round((a.score / a.totalQuestions) * 100),
      finishedAt: a.finishedAt,
      mine: a.student.id === currentStudentId
    }));

    const schoolMap = new Map();
    for (const row of leaderboard) {
      if (!schoolMap.has(row.school)) {
        schoolMap.set(row.school, { school: row.school, students: 0, average: 0, _sum: 0 });
      }
      const s = schoolMap.get(row.school);
      s.students += 1;
      s._sum += row.average;
    }

    const schools = Array.from(schoolMap.values())
      .map((s) => ({
        school: s.school,
        students: s.students,
        average: Math.round(s._sum / s.students)
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 8);

    return res.json({ leaderboard, recent, schools });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getProgress, getCommunity };