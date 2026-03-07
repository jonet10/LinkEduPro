const prisma = require('../../config/prisma');
const { getCommunityConfig } = require('../services/config.service');
const { createCommunityLog } = require('../services/log.service');

function parseSchoolLocation(label) {
  const raw = String(label || '').trim();
  if (!raw) return { schoolName: '', department: null, commune: null };

  const parts = raw.split('/').map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return { schoolName: raw, department: null, commune: null };

  const first = String(parts[0] || '').toLowerCase();
  const hasCountryPrefix = first === 'haiti' || first === 'haïti';

  if (hasCountryPrefix && parts.length >= 4) {
    return {
      schoolName: parts.slice(3).join(' / ') || parts[parts.length - 1],
      department: parts[1] || null,
      commune: parts[2] || null
    };
  }

  if (parts.length >= 3) {
    return {
      schoolName: parts.slice(2).join(' / ') || parts[parts.length - 1],
      department: parts[0] || null,
      commune: parts[1] || null
    };
  }

  return { schoolName: parts[parts.length - 1], department: null, commune: null };
}

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
    const {
      maxPostsPerDay,
      maxPostsPerMonth,
      commentRatePerMin,
      tiktokCreators,
      homeChallengeTitle,
      homeChallengeSubtitle,
      homeChallengeTheme
    } = req.body;
    const hasTiktokCreatorsPayload = Array.isArray(tiktokCreators);
    const nextTiktokCreators = hasTiktokCreatorsPayload ? tiktokCreators : undefined;

    const config = await prisma.communityConfig.upsert({
      where: { id: 1 },
      update: {
        maxPostsPerDay,
        maxPostsPerMonth,
        commentRatePerMin,
        ...(homeChallengeTitle !== undefined ? { homeChallengeTitle } : {}),
        ...(homeChallengeSubtitle !== undefined ? { homeChallengeSubtitle } : {}),
        ...(homeChallengeTheme !== undefined ? { homeChallengeTheme } : {}),
        ...(hasTiktokCreatorsPayload ? { tiktokCreators: nextTiktokCreators } : {}),
        updatedBy: req.user.id
      },
      create: {
        id: 1,
        maxPostsPerDay,
        maxPostsPerMonth,
        commentRatePerMin,
        homeChallengeTitle: homeChallengeTitle || 'Vote de la semaine',
        homeChallengeSubtitle: homeChallengeSubtitle || 'Choisis la personne qui doit rester en tête cette semaine.',
        homeChallengeTheme: homeChallengeTheme || 'TIKTOKERS',
        tiktokCreators: hasTiktokCreatorsPayload ? nextTiktokCreators : [],
        updatedBy: req.user.id
      }
    });

    await createCommunityLog({
      actorId: req.user.id,
      action: 'COMMUNITY_CONFIG_UPDATED',
      entityType: 'CommunityConfig',
      entityId: '1',
      metadata: {
        maxPostsPerDay,
        maxPostsPerMonth,
        commentRatePerMin,
        ...(homeChallengeTitle !== undefined ? { homeChallengeTitle } : {}),
        ...(homeChallengeSubtitle !== undefined ? { homeChallengeSubtitle } : {}),
        ...(homeChallengeTheme !== undefined ? { homeChallengeTheme } : {}),
        ...(hasTiktokCreatorsPayload ? { tiktokCreatorsCount: nextTiktokCreators.length } : {})
      }
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

    let paidLibraryPurchases = [];
    try {
      paidLibraryPurchases = await prisma.libraryPurchase.findMany({
        where: { status: 'PAID' },
        include: {
          book: {
            select: {
              uploadedBy: true,
              uploader: {
                select: { role: true }
              }
            }
          }
        }
      });
    } catch (error) {
      const knownSchemaIssue = error?.code === 'P2021' || error?.code === 'P2022';
      if (!knownSchemaIssue) throw error;
    }

    let successfulRemedialTransactions = [];
    try {
      successfulRemedialTransactions = await prisma.remedialTransaction.findMany({
        where: { status: 'SUCCESS' },
        include: {
          session: {
            select: {
              teacherId: true,
              teacher: {
                select: { role: true }
              }
            }
          }
        }
      });
    } catch (error) {
      const knownSchemaIssue = error?.code === 'P2021' || error?.code === 'P2022';
      if (!knownSchemaIssue) throw error;
    }

    const librarySummary = paidLibraryPurchases.reduce((acc, row) => {
      const uploaderRole = String(row.book?.uploader?.role || '').toUpperCase();
      const sellerAmount = Number(row.sellerAmount || 0);
      const platformCommission = Number(row.platformCommission || 0);
      const grossAmount = Number(row.amount || 0);

      acc.gross += grossAmount;
      acc.platformCommissionTotal += platformCommission;

      if (uploaderRole === 'ADMIN') {
        acc.adminBookRevenue += sellerAmount;
        acc.adminBooksSales += 1;
        return acc;
      }

      if (uploaderRole === 'TEACHER') {
        acc.teacherBookSellerRevenue += sellerAmount;
        acc.teacherBookSales += 1;
      } else if (uploaderRole === 'STUDENT') {
        acc.studentBookSellerRevenue += sellerAmount;
        acc.studentBookSales += 1;
      }
      acc.commissionFromTeacherStudentBooks += platformCommission;
      return acc;
    }, {
      gross: 0,
      platformCommissionTotal: 0,
      adminBookRevenue: 0,
      adminBooksSales: 0,
      teacherBookSellerRevenue: 0,
      teacherBookSales: 0,
      studentBookSellerRevenue: 0,
      studentBookSales: 0,
      commissionFromTeacherStudentBooks: 0
    });

    const remedialSummary = successfulRemedialTransactions.reduce((acc, row) => {
      const teacherRole = String(row.session?.teacher?.role || '').toUpperCase();
      const teacherAmount = Number(row.teacherAmount || 0);
      const platformCommission = Number(row.platformCommission || 0);

      acc.platformCommissionTotal += platformCommission;
      if (teacherRole === 'ADMIN') {
        acc.adminRemedialRevenue += teacherAmount;
      } else if (teacherRole === 'TEACHER') {
        acc.commissionFromTeacherRemedials += platformCommission;
      }
      return acc;
    }, {
      adminRemedialRevenue: 0,
      platformCommissionTotal: 0,
      commissionFromTeacherRemedials: 0
    });

    const premiumRevenue = 0;
    const adminPaidVideoRevenue = 0;
    const adminPaidQuizRevenue = 0;

    const totalPlatformCommissions = librarySummary.platformCommissionTotal + remedialSummary.platformCommissionTotal;
    const totalDirectAdminSales = librarySummary.adminBookRevenue + remedialSummary.adminRemedialRevenue + adminPaidVideoRevenue + adminPaidQuizRevenue;
    const totalPlatformRevenue = totalDirectAdminSales + totalPlatformCommissions + premiumRevenue;

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
      revenues: {
        totals: {
          totalPlatformRevenue,
          totalDirectAdminSales,
          totalPlatformCommissions,
          premiumRevenue
        },
        directSales: {
          books: librarySummary.adminBookRevenue,
          remedials: remedialSummary.adminRemedialRevenue,
          videos: adminPaidVideoRevenue,
          quizzes: adminPaidQuizRevenue
        },
        commissions: {
          fromTeacherAndStudentBooks: librarySummary.commissionFromTeacherStudentBooks,
          fromTeacherRemedials: remedialSummary.commissionFromTeacherRemedials,
          booksTotal: librarySummary.platformCommissionTotal,
          remedialsTotal: remedialSummary.platformCommissionTotal
        },
        publications: {
          studentBookSales: librarySummary.studentBookSales,
          teacherBookSales: librarySummary.teacherBookSales,
          adminBookSales: librarySummary.adminBooksSales
        },
        roadmap: {
          premiumEnabled: false,
          paidVideosEnabled: false,
          paidQuizzesEnabled: false
        }
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

    const baseEnriched = students.map((st) => {
      const parsed = parseSchoolLocation(st.school);
      const fullSchoolKey = String(st.school || '').trim().toLowerCase();
      const schoolNameKey = String(parsed.schoolName || '').trim().toLowerCase();
      const mapped = schoolMap.get(fullSchoolKey) || schoolMap.get(schoolNameKey);

      return {
        ...st,
        department: mapped?.department || parsed.department || null,
        commune: mapped?.commune || mapped?.city || parsed.commune || null
      };
    });

    let enriched = [...baseEnriched];

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
        baseEnriched
          .map((s) => String(s.department || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    const communeOptions = Array.from(
      new Set(
        baseEnriched
          .map((s) => String(s.commune || '').trim())
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

async function listPlatformUsers(req, res, next) {
  try {
    const q = String(req.query.q || '').trim();
    const roleFilter = String(req.query.role || '').trim().toUpperCase();
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) ? Math.max(20, Math.min(500, Math.trunc(limitRaw))) : 200;

    const users = await prisma.student.findMany({
      where: {
        ...(roleFilter ? { role: roleFilter } : {}),
        ...(q
          ? {
              OR: [
                { firstName: { contains: q, mode: 'insensitive' } },
                { lastName: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { school: { contains: q, mode: 'insensitive' } }
              ]
            }
          : {})
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        emailVerified: true,
        school: true,
        gradeLevel: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return res.json({
      users: users.map((user) => ({
        ...user,
        isSuspended: !Boolean(user.emailVerified)
      }))
    });
  } catch (error) {
    return next(error);
  }
}

async function moderatePlatformUser(req, res, next) {
  try {
    const targetId = Number(req.params.userId);
    const action = String(req.body.action || '').trim().toUpperCase();
    if (!Number.isInteger(targetId) || targetId <= 0) {
      return res.status(400).json({ message: 'Utilisateur invalide.' });
    }
    if (!['SUSPEND', 'REACTIVATE'].includes(action)) {
      return res.status(400).json({ message: 'Action invalide.' });
    }
    if (targetId === req.user.id) {
      return res.status(400).json({ message: 'Action impossible sur ton propre compte.' });
    }

    const target = await prisma.student.findUnique({
      where: { id: targetId },
      select: { id: true, email: true, role: true, emailVerified: true }
    });
    if (!target) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    const superAdminEmail = String(process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
    if (superAdminEmail && String(target.email || '').toLowerCase() === superAdminEmail) {
      return res.status(403).json({ message: 'Action interdite sur le compte super admin principal.' });
    }

    const updated = await prisma.student.update({
      where: { id: targetId },
      data: { emailVerified: action === 'REACTIVATE' },
      select: { id: true, emailVerified: true }
    });

    return res.json({
      message: action === 'SUSPEND' ? 'Utilisateur suspendu.' : 'Utilisateur réactivé.',
      user: {
        id: updated.id,
        isSuspended: !Boolean(updated.emailVerified)
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function deletePlatformUser(req, res, next) {
  try {
    const targetId = Number(req.params.userId);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      return res.status(400).json({ message: 'Utilisateur invalide.' });
    }
    if (targetId === req.user.id) {
      return res.status(400).json({ message: 'Suppression impossible sur ton propre compte.' });
    }

    const target = await prisma.student.findUnique({
      where: { id: targetId },
      select: { id: true, email: true }
    });
    if (!target) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    const superAdminEmail = String(process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
    if (superAdminEmail && String(target.email || '').toLowerCase() === superAdminEmail) {
      return res.status(403).json({ message: 'Suppression interdite sur le compte super admin principal.' });
    }

    await prisma.student.delete({ where: { id: targetId } });
    return res.json({ message: 'Utilisateur supprimé.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getConfig,
  updateConfig,
  getSuperDashboard,
  listPlatformStudents,
  listPlatformUsers,
  moderatePlatformUser,
  deletePlatformUser
};
