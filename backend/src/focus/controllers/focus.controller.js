const prisma = require('../../config/prisma');
const { startOfDay, endOfDay, minutesBetween, buildWeekSeries } = require('../utils/focus.utils');

async function listFocusMusic(_req, res, next) {
  try {
    const songs = await prisma.focusSong.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      tracks: songs.map((song) => ({
        id: song.id,
        title: song.title,
        url: song.url,
        category: song.category,
        createdAt: song.createdAt
      }))
    });
  } catch (error) {
    return next(error);
  }
}

async function addCustomSong(req, res, next) {
  try {
    const song = await prisma.focusSong.create({
      data: {
        title: req.body.title,
        url: req.body.url,
        category: req.body.category || 'custom',
        createdBy: req.user.id
      }
    });

    return res.status(201).json({ track: song });
  } catch (error) {
    return next(error);
  }
}

async function logMusicListen(req, res, next) {
  try {
    const song = await prisma.focusSong.findUnique({ where: { id: req.body.songId } });
    if (!song) {
      return res.status(404).json({ message: 'Piste introuvable.' });
    }

    const listen = await prisma.focusSongListen.create({
      data: {
        userId: req.user.id,
        songId: song.id
      }
    });

    return res.status(201).json({ listen });
  } catch (error) {
    return next(error);
  }
}

async function startPomodoro(req, res, next) {
  try {
    const running = await prisma.pomodoroSession.findFirst({
      where: {
        userId: req.user.id,
        status: 'RUNNING'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (running) {
      return res.status(409).json({ message: 'Une session Pomodoro est deja en cours.', sessionId: running.id });
    }

    const session = await prisma.pomodoroSession.create({
      data: {
        userId: req.user.id,
        duration: req.body.workDuration,
        startTime: new Date(),
        endTime: null,
        cycleType: req.body.cycleType,
        status: 'RUNNING'
      }
    });

    return res.status(201).json({
      session: {
        id: session.id,
        userId: session.userId,
        workDuration: req.body.workDuration,
        breakDuration: req.body.breakDuration,
        cycleType: session.cycleType,
        startTime: session.startTime,
        status: session.status
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function stopPomodoro(req, res, next) {
  try {
    const where = {
      userId: req.user.id,
      status: 'RUNNING'
    };

    if (req.body.sessionId) {
      where.id = req.body.sessionId;
    }

    const running = await prisma.pomodoroSession.findFirst({
      where,
      orderBy: { createdAt: 'desc' }
    });

    if (!running || !running.startTime) {
      return res.status(404).json({ message: 'Aucune session Pomodoro active.' });
    }

    const stopAt = new Date();
    const effectiveMinutes = Math.max(minutesBetween(running.startTime, stopAt), 1);

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.pomodoroSession.update({
        where: { id: running.id },
        data: {
          endTime: stopAt,
          duration: effectiveMinutes,
          status: 'COMPLETED'
        }
      });

      const dayStart = startOfDay(stopAt);
      await tx.focusStatistic.upsert({
        where: {
          userId_date: {
            userId: req.user.id,
            date: dayStart
          }
        },
        update: {
          totalTime: { increment: effectiveMinutes },
          pomodorosCompleted: { increment: saved.cycleType === 'WORK' ? 1 : 0 }
        },
        create: {
          userId: req.user.id,
          date: dayStart,
          totalTime: effectiveMinutes,
          pomodorosCompleted: saved.cycleType === 'WORK' ? 1 : 0
        }
      });

      return saved;
    });

    return res.json({
      session: {
        id: updated.id,
        duration: updated.duration,
        startTime: updated.startTime,
        endTime: updated.endTime,
        cycleType: updated.cycleType,
        status: updated.status
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function getFocusStats(req, res, next) {
  try {
    const days = Number(req.query.days || 7);
    const now = new Date();
    const fromDate = startOfDay(now);
    fromDate.setDate(fromDate.getDate() - (days - 1));

    const [weeklyStats, recentSessions, totalAgg, todayAgg] = await Promise.all([
      prisma.focusStatistic.findMany({
        where: {
          userId: req.user.id,
          date: {
            gte: fromDate,
            lt: endOfDay(now)
          }
        },
        orderBy: { date: 'asc' }
      }),
      prisma.pomodoroSession.findMany({
        where: {
          userId: req.user.id,
          status: 'COMPLETED'
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.focusStatistic.aggregate({
        where: { userId: req.user.id },
        _sum: { totalTime: true, pomodorosCompleted: true }
      }),
      prisma.focusStatistic.findUnique({
        where: {
          userId_date: {
            userId: req.user.id,
            date: startOfDay(now)
          }
        }
      })
    ]);

    return res.json({
      dailyFocusMinutes: todayAgg?.totalTime || 0,
      totalFocusMinutes: totalAgg._sum.totalTime || 0,
      totalPomodorosCompleted: totalAgg._sum.pomodorosCompleted || 0,
      weekly: buildWeekSeries(weeklyStats, days),
      recentSessions: recentSessions.map((session) => ({
        id: session.id,
        duration: session.duration,
        startTime: session.startTime,
        endTime: session.endTime,
        cycleType: session.cycleType,
        createdAt: session.createdAt
      }))
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listFocusMusic,
  addCustomSong,
  logMusicListen,
  startPomodoro,
  stopPomodoro,
  getFocusStats
};
