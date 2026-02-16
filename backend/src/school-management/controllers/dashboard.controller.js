const prisma = require('../../config/prisma');

async function getSchoolDashboard(req, res, next) {
  try {
    const schoolId = Number(req.params.schoolId);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(Date.UTC(todayStart.getUTCFullYear(), todayStart.getUTCMonth(), 1));

    const [totalStudents, totalClasses, paymentsToday, monthlyPayments, lateStudents] = await Promise.all([
      prisma.schoolStudent.count({ where: { schoolId, isActive: true } }),
      prisma.schoolClass.count({ where: { schoolId } }),
      prisma.schoolPayment.aggregate({
        where: { schoolId, deletedAt: null, paymentDate: { gte: todayStart } },
        _sum: { amountPaid: true }
      }),
      prisma.schoolPayment.aggregate({
        where: { schoolId, deletedAt: null, paymentDate: { gte: monthStart } },
        _sum: { amountPaid: true }
      }),
      prisma.schoolPayment.count({ where: { schoolId, deletedAt: null, status: { in: ['PENDING', 'PARTIAL'] } } })
    ]);

    return res.json({
      totalStudents,
      totalClasses,
      paymentsToday: paymentsToday._sum.amountPaid || 0,
      monthlyRevenue: monthlyPayments._sum.amountPaid || 0,
      lateStudents
    });
  } catch (error) {
    return next(error);
  }
}

async function getSuperAdminDashboard(req, res, next) {
  try {
    const [totalSchools, totalSchoolStudents, paymentVolume, recentLogs] = await Promise.all([
      prisma.school.count(),
      prisma.schoolStudent.count({ where: { isActive: true } }),
      prisma.schoolPayment.aggregate({ where: { deletedAt: null }, _sum: { amountPaid: true } }),
      prisma.schoolLog.findMany({
        where: { schoolId: { not: null } },
        select: { schoolId: true },
        orderBy: { createdAt: 'desc' },
        take: 1000
      })
    ]);

    const activityMap = new Map();
    recentLogs.forEach((entry) => {
      const key = entry.schoolId;
      activityMap.set(key, (activityMap.get(key) || 0) + 1);
    });

    const schoolActivity = Array.from(activityMap.entries())
      .map(([schoolId, count]) => ({ schoolId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return res.json({
      totalSchools,
      totalSchoolStudents,
      globalPaymentVolume: paymentVolume._sum.amountPaid || 0,
      schoolActivity
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getSchoolDashboard, getSuperAdminDashboard };
