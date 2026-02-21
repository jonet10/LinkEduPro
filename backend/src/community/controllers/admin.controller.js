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

async function listPlatformStudents(req, res, next) {
  try {
    const q = String(req.query.q || '').trim();
    const schoolFilter = String(req.query.school || '').trim();
    const departmentFilter = String(req.query.department || '').trim();
    const communeFilter = String(req.query.commune || '').trim();
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) ? Math.max(20, Math.min(1000, Math.trunc(limitRaw))) : 300;

    const students = await prisma.student.findMany({
      where: {
        role: 'STUDENT',
        ...(q
          ? {
              OR: [
                { firstName: { contains: q, mode: 'insensitive' } },
                { lastName: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { school: { contains: q, mode: 'insensitive' } }
              ]
            }
          : {}),
        ...(schoolFilter ? { school: { contains: schoolFilter, mode: 'insensitive' } } : {})
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        school: true,
        gradeLevel: true,
        createdAt: true
      },
      orderBy: [{ createdAt: 'desc' }],
      take: limit
    });

    const schools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
        city: true,
        department: true,
        commune: true
      }
    });

    const schoolMap = new Map(
      schools.map((s) => [String(s.name || '').trim().toLowerCase(), s])
    );

    let enriched = students.map((st) => {
      const key = String(st.school || '').trim().toLowerCase();
      const mapped = schoolMap.get(key);
      return {
        ...st,
        department: mapped?.department || null,
        commune: mapped?.commune || mapped?.city || null
      };
    });

    if (departmentFilter) {
      enriched = enriched.filter((st) =>
        String(st.department || '').toLowerCase() === departmentFilter.toLowerCase()
      );
    }

    if (communeFilter) {
      enriched = enriched.filter((st) =>
        String(st.commune || '').toLowerCase() === communeFilter.toLowerCase()
      );
    }

    const schoolOptions = Array.from(
      new Set(enriched.map((st) => String(st.school || '').trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    const departmentOptions = Array.from(
      new Set(
        schools
          .map((s) => String(s.department || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    const communeOptions = Array.from(
      new Set(
        schools
          .map((s) => String(s.commune || s.city || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    return res.json({
      students: enriched,
      filters: {
        schools: schoolOptions,
        departments: departmentOptions,
        communes: communeOptions
      }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getConfig, updateConfig, getSuperDashboard, listPlatformStudents };
