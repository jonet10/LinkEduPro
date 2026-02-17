const prisma = require('../../config/prisma');
const { normalizeLevelInput, resolveStudentLevel, toApiLevel } = require('../utils/level');

function getDayWindow(dateInput) {
  const base = dateInput ? new Date(dateInput) : new Date();
  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

async function createMusicTrack(req, res, next) {
  try {
    const level = normalizeLevelInput(req.body.level);

    const track = await prisma.musicTrack.create({
      data: {
        title: req.body.title,
        url: req.body.url,
        level
      }
    });

    return res.status(201).json({
      track: {
        id: track.id,
        title: track.title,
        url: track.url,
        level: toApiLevel(track.level)
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function getMusicTracks(req, res, next) {
  try {
    const student = await prisma.student.findUnique({ where: { id: req.user.id } });
    if (!student) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    const requestedLevel = req.query.level ? normalizeLevelInput(req.query.level) : null;
    const targetLevel = requestedLevel || resolveStudentLevel(student);

    if (!targetLevel) {
      return res.status(400).json({ message: 'Niveau utilisateur non defini.' });
    }

    const tracks = await prisma.musicTrack.findMany({
      where: { level: targetLevel },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      level: toApiLevel(targetLevel),
      tracks: tracks.map((t) => ({
        id: t.id,
        title: t.title,
        url: t.url,
        level: toApiLevel(t.level),
        createdAt: t.createdAt
      }))
    });
  } catch (error) {
    return next(error);
  }
}

async function logPomodoroSession(req, res, next) {
  try {
    const session = await prisma.pomodoroSession.create({
      data: {
        userId: req.user.id,
        duration: req.body.duration
      }
    });

    return res.status(201).json({ session });
  } catch (error) {
    return next(error);
  }
}

async function getDailyStats(req, res, next) {
  try {
    const { start, end } = getDayWindow(req.query.date);

    const sessions = await prisma.pomodoroSession.findMany({
      where: {
        userId: req.user.id,
        createdAt: {
          gte: start,
          lt: end
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);

    return res.json({
      date: start.toISOString().slice(0, 10),
      totalMinutes,
      totalHours: Number((totalMinutes / 60).toFixed(2)),
      sessionCount: sessions.length,
      sessions
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createMusicTrack,
  getMusicTracks,
  logPomodoroSession,
  getDailyStats
};
