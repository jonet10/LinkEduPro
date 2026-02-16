const prisma = require('../../config/prisma');
const { getCommunityConfig } = require('../services/config.service');
const { createCommunityLog } = require('../services/log.service');

async function getConfig(req, res, next) {
  try {
    const config = await getCommunityConfig();
    return res.json({ config });
  } catch (error) {
    return next(error);
  }
}

async function updateConfig(req, res, next) {
  try {
    const { maxPostsPerDay, maxPostsPerMonth, commentRatePerMin } = req.body;

    const config = await prisma.communityConfig.upsert({
      where: { id: 1 },
      update: {
        maxPostsPerDay,
        maxPostsPerMonth,
        commentRatePerMin,
        updatedBy: req.user.id
      },
      create: {
        id: 1,
        maxPostsPerDay,
        maxPostsPerMonth,
        commentRatePerMin,
        updatedBy: req.user.id
      }
    });

    await createCommunityLog({
      actorId: req.user.id,
      action: 'COMMUNITY_CONFIG_UPDATED',
      entityType: 'CommunityConfig',
      entityId: '1',
      metadata: { maxPostsPerDay, maxPostsPerMonth, commentRatePerMin }
    });

    return res.json({ config });
  } catch (error) {
    return next(error);
  }
}

async function getSuperDashboard(req, res, next) {
  try {
    const startOfMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));

    const [
      totalSchools,
      totalSchoolStudents,
      totalPublicStudents,
      totalTeachers,
      totalPosts,
      pendingPosts,
      totalReportsPending,
      totalTeacherInvitations,
      teacherInvitationsPending,
      monthlyPaymentVolume,
      recentActivity
    ] = await Promise.all([
      prisma.school.count(),
      prisma.schoolStudent.count({ where: { isActive: true } }),
      prisma.student.count({ where: { role: 'STUDENT' } }),
      prisma.student.count({ where: { role: 'TEACHER' } }),
      prisma.blogPost.count({ where: { isDeleted: false } }),
      prisma.blogPost.count({ where: { isDeleted: false, isApproved: false } }),
      prisma.postReport.count({ where: { status: 'PENDING' } }),
      prisma.teacherInvitation.count(),
      prisma.teacherInvitation.count({ where: { used: false, expiresAt: { gt: new Date() } } }),
      prisma.schoolPayment.aggregate({
        where: { deletedAt: null, paymentDate: { gte: startOfMonth } },
        _sum: { amountPaid: true }
      }),
      prisma.communityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 15
      })
    ]);

    return res.json({
      analytics: {
        schools: totalSchools,
        schoolStudents: totalSchoolStudents,
        publicStudents: totalPublicStudents,
        teachers: totalTeachers,
        posts: totalPosts,
        pendingPosts,
        pendingReports: totalReportsPending,
        teacherInvitations: totalTeacherInvitations,
        activeTeacherInvitations: teacherInvitationsPending,
        monthlyInternalPayments: monthlyPaymentVolume._sum.amountPaid || 0
      },
      recentActivity
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getConfig, updateConfig, getSuperDashboard };
