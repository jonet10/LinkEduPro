const prisma = require('../../config/prisma');
const { toApiLevel } = require('../utils/level');

async function getDashboard(req, res, next) {
  try {
    const [focusAgg, topFocus, contentAgg, pendingContent] = await Promise.all([
      prisma.pomodoroSession.aggregate({
        _sum: { duration: true }
      }),
      prisma.pomodoroSession.groupBy({
        by: ['userId'],
        _sum: { duration: true },
        _count: { _all: true },
        orderBy: { _sum: { duration: 'desc' } },
        take: 10
      }),
      prisma.content.groupBy({
        by: ['status'],
        _count: { _all: true }
      }),
      prisma.content.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: 50,
        include: {
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      })
    ]);

    const studentIds = topFocus.map((row) => row.userId);
    const students = studentIds.length
      ? await prisma.student.findMany({
          where: { id: { in: studentIds } },
          select: { id: true, firstName: true, lastName: true, level: true }
        })
      : [];

    const studentMap = new Map(students.map((s) => [s.id, s]));

    const mostActiveStudents = topFocus.map((row) => {
      const user = studentMap.get(row.userId);
      return {
        userId: row.userId,
        firstName: user?.firstName || null,
        lastName: user?.lastName || null,
        level: toApiLevel(user?.level || null),
        totalMinutes: row._sum.duration || 0,
        sessionCount: row._count._all
      };
    });

    const contentSubmissionCount = {
      total: contentAgg.reduce((sum, item) => sum + item._count._all, 0),
      byStatus: contentAgg.reduce((acc, item) => {
        acc[item.status.toLowerCase()] = item._count._all;
        return acc;
      }, {})
    };

    return res.json({
      stats: {
        totalFocusHours: Number((((focusAgg._sum.duration || 0) / 60)).toFixed(2)),
        mostActiveStudents,
        contentSubmissionCount
      },
      contentApprovalPanel: pendingContent.map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type.toLowerCase(),
        level: toApiLevel(item.level),
        status: item.status.toLowerCase(),
        createdAt: item.createdAt,
        teacher: item.teacher
      }))
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getDashboard };
