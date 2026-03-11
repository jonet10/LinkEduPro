const path = require('path');
const prisma = require('../config/prisma');
const { createNotification, notifyAdmins } = require('../services/notifications');

const ACTIVE_OWNER_PROJECT_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'FUNDING'];
const CURRENT_RULES_VERSION = String(process.env.EDUC_COLLECT_RULES_VERSION || 'v1').trim();
const MAX_PROJECT_TARGET = Number(process.env.EDUC_COLLECT_MAX_TARGET || 150000);

function asAmount(value) {
  return Number(value || 0);
}

function getClientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').trim();
  if (forwarded) return forwarded.split(',')[0].trim();
  return String(req.ip || req.socket?.remoteAddress || '').trim() || null;
}

function parseBudgetItems(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }
  return [];
}

function buildProjectSummary(project) {
  const target = asAmount(project.targetAmount);
  const collected = asAmount(project.currentAmount);
  return {
    id: project.id,
    title: project.title,
    category: project.category,
    description: project.description,
    targetAmount: target,
    collectedAmount: collected,
    remainingAmount: Math.max(0, target - collected),
    progressPercent: target > 0 ? Math.min(100, Math.round((collected / target) * 100)) : 0,
    contributorCount: Number(project.contributorCount || 0),
    status: project.status,
    school: project.school,
    budgetItems: project.budgetItems,
    deadline: project.deadline,
    proofUrl: project.proofUrl,
    teacherValidationText: project.teacherValidationText,
    teacherValidationSignature: project.teacherValidationSignature,
    reviewNote: project.reviewNote,
    disbursedTo: project.disbursedTo,
    disbursementNote: project.disbursementNote,
    suspendedReason: project.suspendedReason,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    owner: project.owner
      ? {
          id: project.owner.id,
          firstName: project.owner.firstName,
          lastName: project.owner.lastName,
          school: project.owner.school
        }
      : null
  };
}

function buildDonationView(donation, canSeeSensitive) {
  const donorFullName = `${String(donation.donor?.firstName || '').trim()} ${String(donation.donor?.lastName || '').trim()}`.trim() || 'Utilisateur';
  const isPartner = donation.donorType === 'PARTNER';
  const partnerVerified = Boolean(donation.donor?.eduCollectPartnerProfile?.isVerified);

  if (canSeeSensitive) {
    return {
      id: donation.id,
      donorName: donorFullName,
      donorType: donation.donorType,
      partnerVerified,
      amount: asAmount(donation.amount),
      paymentMethod: donation.paymentMethod,
      transactionReference: donation.transactionReference,
      visibilityType: donation.visibilityType,
      status: donation.status,
      createdAt: donation.createdAt
    };
  }

  let donorName = donorFullName;
  let amount = asAmount(donation.amount);

  if (donation.visibilityType === 'ANONYMOUS') {
    donorName = 'Anonyme';
    amount = null;
  } else if (donation.visibilityType === 'NAME_ONLY') {
    amount = null;
  }

  return {
    id: donation.id,
    donorName,
    donorType: donation.donorType,
    partnerVerified: isPartner && partnerVerified,
    amount,
    visibilityType: donation.visibilityType,
    createdAt: donation.createdAt
  };
}

async function writeLog({ projectId = null, donationId = null, actorId = null, action, details = null }) {
  await prisma.eduCollectTransactionLog.create({
    data: {
      projectId,
      donationId,
      actorId,
      action,
      details
    }
  });
}

async function listProjects(req, res, next) {
  try {
    const isMine = Boolean(req.query.mine);
    const requestedStatus = req.query.status || null;
    const isAdmin = req.user?.role === 'ADMIN';

    if (isMine && !req.user) {
      return res.status(401).json({ message: 'Connexion requise.' });
    }

    const where = {};
    if (isMine) {
      where.ownerId = req.user.id;
    } else if (!isAdmin) {
      where.status = 'APPROVED';
    }

    if (requestedStatus) {
      if (!isAdmin && !isMine && requestedStatus !== 'APPROVED') {
        return res.status(403).json({ message: 'Statut non autorisé pour cette vue.' });
      }
      where.status = requestedStatus;
    }

    const projects = await prisma.eduCollectProject.findMany({
      where,
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, school: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ projects: projects.map(buildProjectSummary) });
  } catch (error) {
    return next(error);
  }
}

async function getProjectDetail(req, res, next) {
  try {
    const projectId = Number(req.params.id);
    const project = await prisma.eduCollectProject.findUnique({
      where: { id: projectId },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, school: true } },
        donations: {
          include: {
            donor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                eduCollectPartnerProfile: { select: { isVerified: true } }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        reports: {
          include: { author: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ message: 'Projet introuvable.' });
    }

    const isOwner = req.user?.id && req.user.id === project.ownerId;
    const isAdmin = req.user?.role === 'ADMIN';
    const canSeeSensitive = Boolean(isOwner || isAdmin);

    if (project.status !== 'APPROVED' && !canSeeSensitive) {
      return res.status(403).json({ message: 'Projet non public.' });
    }

    const visibleDonations = project.donations
      .filter((d) => canSeeSensitive || d.status === 'CONFIRMED')
      .map((d) => buildDonationView(d, canSeeSensitive));

    return res.json({
      project: {
        ...buildProjectSummary(project),
        donations: visibleDonations,
        reports: project.reports.map((report) => ({
          id: report.id,
          content: report.content,
          createdAt: report.createdAt,
          author: report.author
            ? `${report.author.firstName} ${report.author.lastName}`.trim()
            : 'Utilisateur'
        }))
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function acceptRules(req, res, next) {
  try {
    const accepted = await prisma.eduCollectRuleAcceptance.create({
      data: {
        userId: req.user.id,
        ipAddress: getClientIp(req),
        rulesVersion: String(req.body.rulesVersion || CURRENT_RULES_VERSION)
      }
    });

    await writeLog({
      actorId: req.user.id,
      action: 'RULES_ACCEPTED',
      details: { rulesVersion: accepted.rulesVersion }
    });

    return res.status(201).json({ accepted });
  } catch (error) {
    return next(error);
  }
}

async function createProject(req, res, next) {
  try {
    const proofFile = req.file;
    if (!proofFile) {
      return res.status(400).json({ message: 'Justificatif requis.' });
    }

    const accepted = await prisma.eduCollectRuleAcceptance.findFirst({
      where: { userId: req.user.id, rulesVersion: CURRENT_RULES_VERSION },
      orderBy: { acceptedAt: 'desc' }
    });
    if (!accepted) {
      return res.status(400).json({
        message: `Acceptation du reglement ${CURRENT_RULES_VERSION} obligatoire avant creation.`
      });
    }

    const activeCount = await prisma.eduCollectProject.count({
      where: {
        ownerId: req.user.id,
        status: { in: ACTIVE_OWNER_PROJECT_STATUSES }
      }
    });
    if (activeCount > 0) {
      return res.status(400).json({ message: 'Un seul projet actif est autorisé par élève.' });
    }

    const targetAmount = Number(req.body.targetAmount || 0);
    if (targetAmount > MAX_PROJECT_TARGET) {
      return res.status(400).json({ message: `Le plafond par projet est ${MAX_PROJECT_TARGET} HTG.` });
    }

    const deadline = new Date(req.body.deadline);
    if (Number.isNaN(deadline.getTime()) || deadline.getTime() <= Date.now()) {
      return res.status(400).json({ message: 'Date limite invalide.' });
    }

    const budgetItems = parseBudgetItems(req.body.budgetItems);
    if (!Array.isArray(budgetItems) || budgetItems.length === 0) {
      return res.status(400).json({ message: 'Budget detaille obligatoire.' });
    }

    const proofUrl = `/storage/educollect/proofs/${path.basename(proofFile.path)}`;
    const created = await prisma.eduCollectProject.create({
      data: {
        ownerId: req.user.id,
        title: req.body.title.trim(),
        category: req.body.category.trim(),
        description: req.body.description.trim(),
        targetAmount,
        budgetItems,
        deadline,
        school: req.body.school.trim(),
        proofUrl,
        teacherValidationText: req.body.teacherValidationText.trim(),
        teacherValidationSignature: req.body.teacherValidationSignature ? req.body.teacherValidationSignature.trim() : null,
        status: 'PENDING_REVIEW'
      },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, school: true } }
      }
    });

    await notifyAdmins({
      type: 'EDUCOLLECT_REVIEW_REQUIRED',
      title: 'Nouveau projet EduCollect',
      message: `${created.title} attend validation.`,
      entityType: 'EduCollectProject',
      entityId: String(created.id)
    });

    await writeLog({
      projectId: created.id,
      actorId: req.user.id,
      action: 'PROJECT_CREATED',
      details: { status: created.status }
    });

    return res.status(201).json({ project: buildProjectSummary(created) });
  } catch (error) {
    return next(error);
  }
}

async function donateToProject(req, res, next) {
  try {
    const projectId = Number(req.params.id);
    const project = await prisma.eduCollectProject.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });
    if (project.ownerId === req.user.id) {
      return res.status(400).json({ message: 'Auto-don non autorisé.' });
    }
    if (project.status !== 'APPROVED') {
      return res.status(400).json({ message: 'Ce projet ne peut plus recevoir de dons.' });
    }

    const donorType = req.user.role === 'STUDENT' ? 'STUDENT' : 'PARTNER';
    if (donorType === 'PARTNER') {
      await prisma.eduCollectPartnerProfile.upsert({
        where: { userId: req.user.id },
        create: { userId: req.user.id, isVerified: false },
        update: {}
      });
    }

    const amount = Number(req.body.amount || 0);
    const transactionReference = String(req.body.transactionReference || '').trim() || `EDC-${Date.now()}-${req.user.id}`;
    const donation = await prisma.eduCollectDonation.create({
      data: {
        projectId,
        donorId: req.user.id,
        donorType,
        amount,
        paymentMethod: req.body.paymentMethod,
        transactionReference,
        visibilityType: req.body.visibilityType,
        status: 'CONFIRMED',
        confirmedAt: new Date()
      }
    });

    const confirmed = await prisma.eduCollectDonation.aggregate({
      where: { projectId, status: 'CONFIRMED' },
      _sum: { amount: true }
    });
    const contributors = await prisma.eduCollectDonation.groupBy({
      by: ['donorId'],
      where: { projectId, status: 'CONFIRMED' }
    });

    const nextCollected = asAmount(confirmed._sum.amount);
    const reached = nextCollected >= asAmount(project.targetAmount);
    const updatedProject = await prisma.eduCollectProject.update({
      where: { id: projectId },
      data: {
        currentAmount: nextCollected,
        contributorCount: contributors.length,
        ...(reached ? { status: 'FUNDING' } : {})
      }
    });

    await createNotification({
      userId: project.ownerId,
      type: 'EDUCOLLECT_NEW_DONATION',
      title: 'Nouveau don',
      message: `Votre projet "${project.title}" vient de recevoir ${amount} HTG.`,
      entityType: 'EduCollectProject',
      entityId: String(project.id)
    });

    if (reached) {
      await Promise.all([
        createNotification({
          userId: project.ownerId,
          type: 'EDUCOLLECT_GOAL_REACHED',
          title: 'Objectif atteint',
          message: `L'objectif de "${project.title}" est atteint. Verification admin en cours.`,
          entityType: 'EduCollectProject',
          entityId: String(project.id)
        }),
        notifyAdmins({
          type: 'EDUCOLLECT_GOAL_REACHED',
          title: 'Objectif atteint',
          message: `Le projet "${project.title}" a atteint son objectif.`,
          entityType: 'EduCollectProject',
          entityId: String(project.id)
        })
      ]);
    }

    await writeLog({
      projectId,
      donationId: donation.id,
      actorId: req.user.id,
      action: 'DONATION_CONFIRMED',
      details: {
        amount,
        paymentMethod: donation.paymentMethod,
        visibilityType: donation.visibilityType,
        reachedObjective: reached
      }
    });

    return res.status(201).json({
      donation: {
        id: donation.id,
        amount: asAmount(donation.amount),
        paymentMethod: donation.paymentMethod,
        status: donation.status
      },
      projectStatus: updatedProject.status
    });
  } catch (error) {
    return next(error);
  }
}

async function submitProjectReport(req, res, next) {
  try {
    const projectId = Number(req.params.id);
    const project = await prisma.eduCollectProject.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });

    const isOwner = req.user.id === project.ownerId;
    const isAdmin = req.user.role === 'ADMIN';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Action non autorisée.' });
    }

    const report = await prisma.eduCollectProjectReport.create({
      data: {
        projectId,
        authorId: req.user.id,
        content: req.body.content.trim()
      }
    });

    await notifyAdmins({
      type: 'EDUCOLLECT_REPORT_SUBMITTED',
      title: 'Rapport EduCollect soumis',
      message: `Un rapport final a ete soumis pour "${project.title}".`,
      entityType: 'EduCollectProject',
      entityId: String(project.id)
    });

    await writeLog({
      projectId,
      actorId: req.user.id,
      action: 'PROJECT_REPORT_SUBMITTED',
      details: { reportId: report.id }
    });

    return res.status(201).json({ report });
  } catch (error) {
    return next(error);
  }
}

async function reviewProject(req, res, next) {
  try {
    const projectId = Number(req.params.id);
    const project = await prisma.eduCollectProject.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });

    const decision = req.body.decision;
    const nextStatus = decision === 'APPROVED' ? 'APPROVED' : 'REJECTED';
    const updated = await prisma.eduCollectProject.update({
      where: { id: projectId },
      data: {
        status: nextStatus,
        reviewNote: req.body.note ? req.body.note.trim() : null,
        reviewedBy: req.user.id,
        reviewedAt: new Date()
      }
    });

    await createNotification({
      userId: project.ownerId,
      type: 'EDUCOLLECT_PROJECT_REVIEWED',
      title: nextStatus === 'APPROVED' ? 'Projet approuve' : 'Projet refuse',
      message: `Votre projet "${project.title}" est ${nextStatus === 'APPROVED' ? 'approuve' : 'rejete'}.`,
      entityType: 'EduCollectProject',
      entityId: String(project.id)
    });

    await writeLog({
      projectId,
      actorId: req.user.id,
      action: nextStatus === 'APPROVED' ? 'PROJECT_APPROVED' : 'PROJECT_REJECTED',
      details: { note: updated.reviewNote || null }
    });

    return res.json({ project: buildProjectSummary(updated) });
  } catch (error) {
    return next(error);
  }
}

async function suspendProject(req, res, next) {
  try {
    const projectId = Number(req.params.id);
    const project = await prisma.eduCollectProject.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });

    const updated = await prisma.eduCollectProject.update({
      where: { id: projectId },
      data: {
        status: 'SUSPENDED',
        suspendedReason: req.body.reason.trim()
      }
    });

    await createNotification({
      userId: project.ownerId,
      type: 'EDUCOLLECT_PROJECT_SUSPENDED',
      title: 'Projet suspendu',
      message: `Votre projet "${project.title}" a ete suspendu.`,
      entityType: 'EduCollectProject',
      entityId: String(project.id)
    });

    await writeLog({
      projectId,
      actorId: req.user.id,
      action: 'PROJECT_SUSPENDED',
      details: { reason: req.body.reason.trim() }
    });

    return res.json({ project: buildProjectSummary(updated) });
  } catch (error) {
    return next(error);
  }
}

async function disburseProject(req, res, next) {
  try {
    const projectId = Number(req.params.id);
    const project = await prisma.eduCollectProject.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });

    if (asAmount(project.currentAmount) < asAmount(project.targetAmount)) {
      return res.status(400).json({ message: 'Objectif non atteint. Décaissement non autorisé.' });
    }

    const updated = await prisma.eduCollectProject.update({
      where: { id: projectId },
      data: {
        status: 'FUNDED',
        disbursedTo: req.body.disbursedTo.trim(),
        disbursementNote: req.body.note ? req.body.note.trim() : null,
        disbursedBy: req.user.id,
        disbursedAt: new Date()
      }
    });

    await createNotification({
      userId: project.ownerId,
      type: 'EDUCOLLECT_PROJECT_FUNDED',
      title: 'Décaissement autorisé',
      message: `Le projet "${project.title}" a ete marque finance.`,
      entityType: 'EduCollectProject',
      entityId: String(project.id)
    });

    await writeLog({
      projectId,
      actorId: req.user.id,
      action: 'PROJECT_DISBURSED',
      details: { disbursedTo: req.body.disbursedTo.trim() }
    });

    return res.json({ project: buildProjectSummary(updated) });
  } catch (error) {
    return next(error);
  }
}

async function closeProject(req, res, next) {
  try {
    const projectId = Number(req.params.id);
    const project = await prisma.eduCollectProject.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });

    const updated = await prisma.eduCollectProject.update({
      where: { id: projectId },
      data: {
        status: 'CLOSED',
        reviewNote: req.body.note ? req.body.note.trim() : project.reviewNote
      }
    });

    await createNotification({
      userId: project.ownerId,
      type: 'EDUCOLLECT_PROJECT_CLOSED',
      title: 'Projet cloture',
      message: `Le projet "${project.title}" est cloture.`,
      entityType: 'EduCollectProject',
      entityId: String(project.id)
    });

    await writeLog({
      projectId,
      actorId: req.user.id,
      action: 'PROJECT_CLOSED',
      details: { note: req.body.note || null }
    });

    return res.json({ project: buildProjectSummary(updated) });
  } catch (error) {
    return next(error);
  }
}

async function flagProject(req, res, next) {
  try {
    const projectId = Number(req.params.id);
    const project = await prisma.eduCollectProject.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ message: 'Projet introuvable.' });
    if (project.ownerId === req.user.id) {
      return res.status(400).json({ message: 'Le proprietaire ne peut pas signaler son projet.' });
    }

    const flag = await prisma.eduCollectProjectFlag.create({
      data: {
        projectId,
        reporterId: req.user.id,
        reason: req.body.reason.trim(),
        details: req.body.details ? req.body.details.trim() : null
      }
    });

    const openFlagsCount = await prisma.eduCollectProjectFlag.count({
      where: { projectId, status: 'OPEN' }
    });

    if (openFlagsCount >= 3 && ['APPROVED', 'FUNDING'].includes(project.status)) {
      await prisma.eduCollectProject.update({
        where: { id: projectId },
        data: {
          status: 'SUSPENDED',
          suspendedReason: 'Suspension automatique: plusieurs signalements.'
        }
      });
      await notifyAdmins({
        type: 'EDUCOLLECT_PROJECT_AUTO_SUSPENDED',
        title: 'Projet suspendu automatiquement',
        message: `Le projet "${project.title}" a ete suspendu suite aux signalements.`,
        entityType: 'EduCollectProject',
        entityId: String(project.id)
      });
    }

    await writeLog({
      projectId,
      actorId: req.user.id,
      action: 'PROJECT_FLAGGED',
      details: { reason: req.body.reason.trim(), autoSuspended: openFlagsCount >= 3 }
    });

    return res.status(201).json({ flag, openFlagsCount });
  } catch (error) {
    return next(error);
  }
}

async function setPartnerVerification(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    const user = await prisma.student.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });

    const profile = await prisma.eduCollectPartnerProfile.upsert({
      where: { userId },
      create: {
        userId,
        isVerified: Boolean(req.body.isVerified),
        verifiedAt: req.body.isVerified ? new Date() : null,
        verifiedBy: req.body.isVerified ? req.user.id : null
      },
      update: {
        isVerified: Boolean(req.body.isVerified),
        verifiedAt: req.body.isVerified ? new Date() : null,
        verifiedBy: req.body.isVerified ? req.user.id : null
      }
    });

    await writeLog({
      actorId: req.user.id,
      action: 'PARTNER_VERIFICATION_UPDATED',
      details: { userId, isVerified: profile.isVerified }
    });

    return res.json({ partnerProfile: profile });
  } catch (error) {
    return next(error);
  }
}

async function getAdminDashboard(req, res, next) {
  try {
    const [pendingProjects, activeProjects, fundedProjects, totalCollected, transactions, reports, pendingProjectList] = await Promise.all([
      prisma.eduCollectProject.count({ where: { status: 'PENDING_REVIEW' } }),
      prisma.eduCollectProject.count({ where: { status: { in: ['APPROVED', 'FUNDING'] } } }),
      prisma.eduCollectProject.count({ where: { status: 'FUNDED' } }),
      prisma.eduCollectDonation.aggregate({ where: { status: 'CONFIRMED' }, _sum: { amount: true } }),
      prisma.eduCollectDonation.findMany({
        where: { status: 'CONFIRMED' },
        include: {
          project: { select: { id: true, title: true } },
          donor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              eduCollectPartnerProfile: { select: { isVerified: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      }),
      prisma.eduCollectProjectReport.findMany({
        include: {
          project: { select: { id: true, title: true } },
          author: { select: { id: true, firstName: true, lastName: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      }),
      prisma.eduCollectProject.findMany({
        where: { status: 'PENDING_REVIEW' },
        include: { owner: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100
      })
    ]);

    return res.json({
      stats: {
        pendingProjects,
        activeProjects,
        fundedProjects,
        totalCollected: asAmount(totalCollected._sum.amount)
      },
      transactions: transactions.map((row) => ({
        id: row.id,
        projectId: row.projectId,
        projectTitle: row.project?.title || '',
        donorName: `${row.donor?.firstName || ''} ${row.donor?.lastName || ''}`.trim() || 'Utilisateur',
        donorType: row.donorType,
        partnerVerified: Boolean(row.donor?.eduCollectPartnerProfile?.isVerified),
        amount: asAmount(row.amount),
        paymentMethod: row.paymentMethod,
        transactionReference: row.transactionReference,
        visibilityType: row.visibilityType,
        createdAt: row.createdAt
      })),
      reports: reports.map((row) => ({
        id: row.id,
        projectId: row.projectId,
        projectTitle: row.project?.title || '',
        authorName: `${row.author?.firstName || ''} ${row.author?.lastName || ''}`.trim() || 'Utilisateur',
        content: row.content,
        createdAt: row.createdAt
      })),
      pendingProjectsList: pendingProjectList.map((row) => ({
        id: row.id,
        title: row.title,
        category: row.category,
        targetAmount: asAmount(row.targetAmount),
        createdAt: row.createdAt,
        ownerName: `${row.owner?.firstName || ''} ${row.owner?.lastName || ''}`.trim() || 'Utilisateur'
      }))
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listProjects,
  getProjectDetail,
  acceptRules,
  createProject,
  donateToProject,
  submitProjectReport,
  reviewProject,
  suspendProject,
  disburseProject,
  closeProject,
  flagProject,
  setPartnerVerification,
  getAdminDashboard
};
